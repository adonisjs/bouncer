/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { inspect } from 'node:util'
import { RuntimeException } from '@poppinss/utils'
import { type ContainerResolver } from '@adonisjs/core/container'

import debug from './debug.js'
import { AuthorizationResponse } from './response.js'
import { E_AUTHORIZATION_FAILURE } from './errors.js'
import { ability as createAbility } from './ability.js'
import { PolicyAuthorizer } from './policy_authorizer.js'
import type {
  LazyImport,
  Constructor,
  BouncerAbility,
  ResponseBuilder,
  UnWrapLazyImport,
  AuthorizerResponse,
  AuthorizationEmitter,
  NarrowAbilitiesForAUser,
} from './types.js'

/**
 * Bouncer exposes the API to evaluate bouncer abilities and policies to
 * verify if a user is authorized to perform the given action
 */
export class Bouncer<
  User extends Record<any, any>,
  Abilities extends Record<string, BouncerAbility<any>> | undefined = undefined,
  Policies extends Record<string, LazyImport<Constructor<any>>> | undefined = undefined,
> {
  /**
   * Response builder is used to normalize bouncer responses
   */
  static responseBuilder: ResponseBuilder = (response) => {
    return typeof response === 'boolean' ? new AuthorizationResponse(response) : response
  }

  /**
   * Emitter to emit events
   */
  static emitter?: AuthorizationEmitter

  /**
   * Define a bouncer ability from a callback
   */
  static define = createAbility

  /**
   * User resolver to lazily resolve the user
   */
  #userOrResolver: User | (() => User | null) | null

  /**
   * Reference to the resolved user
   */
  #user?: User | null

  /**
   * Pre-defined abilities
   */
  abilities?: Abilities

  /**
   * Pre-defined policies
   */
  policies?: Policies

  /**
   * Reference to the container resolver to construct
   * policy classes.
   */
  #containerResolver?: ContainerResolver<any>

  constructor(
    userOrResolver: User | (() => User | null) | null,
    abilities?: Abilities,
    policies?: Policies
  ) {
    this.#userOrResolver = userOrResolver
    this.abilities = abilities
    this.policies = policies
  }

  /**
   * Returns reference to the user object
   */
  #getUser() {
    if (this.#user === undefined) {
      if (typeof this.#userOrResolver === 'function') {
        this.#user = this.#userOrResolver()
      } else {
        this.#user = this.#userOrResolver
      }
    }

    return this.#user
  }

  /**
   * Emits the event and sends normalized response
   */
  #emitAndRespond(abilitiy: string, result: boolean | AuthorizationResponse, args: any[]) {
    const response = Bouncer.responseBuilder(result)
    if (Bouncer.emitter) {
      Bouncer.emitter.emit('authorization:finished', {
        user: this.#user,
        action: abilitiy,
        response,
        parameters: args,
      })
    }

    return response
  }

  /**
   * Returns an instance of PolicyAuthorizer. PolicyAuthorizer is
   * used to authorize user and actions using a given policy
   */
  with<Policy extends keyof Policies>(
    policy: Policy
  ): Policies extends Record<string, LazyImport<Constructor<any>>>
    ? PolicyAuthorizer<User, UnWrapLazyImport<Policies[Policy]>>
    : never
  with<Policy extends Constructor<any>>(policy: Policy): PolicyAuthorizer<User, Policy>
  with<Policy extends keyof Policies & string>(policy: Policy) {
    if (typeof policy !== 'function') {
      /**
       * Ensure the policy is pre-registered
       */
      if (!this.policies || !this.policies[policy]) {
        throw new RuntimeException(`Invalid bouncer policy "${inspect(policy)}"`)
      }

      return new PolicyAuthorizer(this.#getUser(), this.policies[policy], Bouncer.responseBuilder)
        .setContainerResolver(this.#containerResolver)
        .setEmitter(Bouncer.emitter)
    }

    return new PolicyAuthorizer(this.#getUser(), policy, Bouncer.responseBuilder)
      .setContainerResolver(this.#containerResolver)
      .setEmitter(Bouncer.emitter)
  }

  /**
   * Set a container resolver to use for resolving policies
   */
  setContainerResolver(containerResolver?: ContainerResolver<any>): this {
    this.#containerResolver = containerResolver
    return this
  }

  /**
   * Execute an ability by reference
   */
  execute<Ability extends BouncerAbility<User>>(
    ability: Ability,
    ...args: Ability extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<AuthorizationResponse>

  /**
   * Execute an ability from the list of pre-defined abilities
   */
  execute<Ability extends NarrowAbilitiesForAUser<User, Abilities>>(
    ability: Ability,
    ...args: Abilities[Ability] extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<AuthorizationResponse>

  async execute(ability: any, ...args: any[]): Promise<AuthorizationResponse> {
    /**
     * Executing ability from a pre-defined list of abilities
     */
    if (this.abilities && this.abilities[ability]) {
      debug('executing pre-registered ability "%s"', ability)
      return this.#emitAndRespond(
        ability,
        await this.abilities[ability].execute(this.#getUser(), ...args),
        args
      )
    }

    /**
     * Ensure value is an ability reference or throw error
     */
    if (!ability || typeof ability !== 'object' || 'execute' in ability === false) {
      throw new RuntimeException(`Invalid bouncer ability "${inspect(ability)}"`)
    }

    /**
     * Executing ability by reference
     */
    if (debug.enabled) {
      debug('executing ability "%s"', ability.name)
    }

    return this.#emitAndRespond(
      ability.original.name,
      await (ability as BouncerAbility<User>).execute(this.#getUser(), ...args),
      args
    )
  }

  /**
   * Check if a user is allowed to perform an action using
   * the ability provided by reference
   */
  allows<Ability extends BouncerAbility<User>>(
    ability: Ability,
    ...args: Ability extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<boolean>

  /**
   * Check if a user is allowed to perform an action using
   * the ability from the pre-defined list of abilities
   */
  allows<Ability extends NarrowAbilitiesForAUser<User, Abilities>>(
    ability: Ability,
    ...args: Abilities[Ability] extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<boolean>
  async allows(ability: any, ...args: any[]): Promise<boolean> {
    const response = await this.execute(ability, ...args)
    return response.authorized
  }

  /**
   * Check if a user is denied from performing an action using
   * the ability provided by reference
   */
  denies<Action extends BouncerAbility<User>>(
    action: Action,
    ...args: Action extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<boolean>

  /**
   * Check if a user is denied from performing an action using
   * the ability from the pre-defined list of abilities
   */
  denies<Action extends NarrowAbilitiesForAUser<User, Abilities>>(
    action: Action,
    ...args: Abilities[Action] extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<boolean>
  async denies(action: any, ...args: any[]): Promise<boolean> {
    const response = await this.execute(action, ...args)
    return !response.authorized
  }

  /**
   * Authorize a user against for a given ability
   *
   * @throws AuthorizationException
   */
  authorize<Action extends BouncerAbility<User>>(
    action: Action,
    ...args: Action extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<void>

  /**
   * Authorize a user against a given ability
   *
   * @throws {@link E_AUTHORIZATION_FAILURE}
   */
  authorize<Ability extends NarrowAbilitiesForAUser<User, Abilities>>(
    ability: Ability,
    ...args: Abilities[Ability] extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<void>
  async authorize(ability: any, ...args: any[]): Promise<void> {
    const response = await this.execute(ability, ...args)
    if (!response.authorized) {
      throw new E_AUTHORIZATION_FAILURE(response)
    }
  }

  /**
   * Returns an object with untyped API to perform authorization
   * checks within edge templates
   */
  edgeHelpers(): {
    bouncer: {
      parent: Bouncer<User, Abilities, Policies>
      can(action: string, ...args: any[]): Promise<boolean>
      cannot(action: string, ...args: any[]): Promise<boolean>
    }
  } {
    return {
      bouncer: {
        parent: this,
        can(action: string, ...args: any[]) {
          const [policyName, ...policyMethods] = action.split('.')
          if (policyMethods.length) {
            return this.parent.with(policyName as any).allows(policyMethods.join('.'), ...args)
          }
          return this.parent.allows(policyName as any, ...args)
        },
        cannot(action: string, ...args: any[]) {
          const [policyName, ...policyMethods] = action.split('.')
          if (policyMethods.length) {
            return this.parent.with(policyName as any).denies(policyMethods.join('.'), ...args)
          }
          return this.parent.denies(policyName as any, ...args)
        },
      },
    }
  }
}
