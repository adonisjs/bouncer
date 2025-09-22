/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { inspect } from 'node:util'
import { RuntimeException } from '@adonisjs/core/exceptions'
import type { EmitterLike } from '@adonisjs/core/types/events'
import { type ContainerResolver } from '@adonisjs/core/container'
import {
  type Constructor,
  type LazyImport,
  type UnWrapLazyImport,
} from '@adonisjs/core/types/common'

import debug from './debug.ts'
import { AuthorizationResponse } from './response.ts'
import { E_AUTHORIZATION_FAILURE } from './errors.ts'
import { ability as createAbility } from './ability.ts'
import { AbilitiesBuilder } from './abilities_builder.ts'
import { PolicyAuthorizer } from './policy_authorizer.ts'
import type {
  BouncerEvents,
  BouncerAbility,
  ResponseBuilder,
  BouncerAuthorizer,
  AuthorizerResponse,
  NarrowAbilitiesForAUser,
} from './types.ts'

/**
 * Bouncer exposes the API to evaluate bouncer abilities and policies to
 * verify if a user is authorized to perform the given action.
 *
 * @example
 * ```js
 * const bouncer = new Bouncer(user, abilities, policies)
 *
 * // Check ability
 * const canEdit = await bouncer.allows('editPost', post)
 *
 * // Use policy
 * const canView = await bouncer.with('PostPolicy').allows('view', post)
 *
 * // Authorize (throws on failure)
 * await bouncer.authorize('deletePost', post)
 * ```
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
   * Define an ability using the AbilityBuilder
   *
   * @param name Unique name for the ability
   * @param authorizer Function that determines if the action is allowed
   * @param options Optional configuration for the ability
   *
   * @example
   * ```js
   * const abilities = Bouncer.define('editPost', (user, post) => {
   *   return user.id === post.authorId
   * })
   * ```
   */
  static define<Name extends string, Authorizer extends BouncerAuthorizer<any>>(
    name: Name,
    authorizer: Authorizer,
    options?: { allowGuest: boolean }
  ) {
    return new AbilitiesBuilder({}).define(name, authorizer, options)
  }

  /**
   * Emitter to emit events
   */
  static emitter?: EmitterLike<BouncerEvents>

  /**
   * Define a bouncer ability from a callback
   */
  static ability = createAbility

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

  /**
   * An object with helpers to be shared with Edge for
   * performing authorization.
   */
  edgeHelpers: {
    bouncer: {
      parent: Bouncer<User, Abilities, Policies>
      can(action: string, ...args: any[]): Promise<boolean>
      cannot(action: string, ...args: any[]): Promise<boolean>
    }
  } = {
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

  /**
   * Create a new Bouncer instance
   *
   * @param userOrResolver User object or function to resolve the user
   * @param abilities Pre-defined abilities for authorization
   * @param policies Pre-defined policies for authorization
   */
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
   *
   * @param policy Policy class or policy name to use for authorization
   *
   * @example
   * ```js
   * await bouncer.with('PostPolicy').allows('edit', post)
   * await bouncer.with(PostPolicy).denies('delete', post)
   * ```
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
   *
   * @param containerResolver IoC container resolver for constructing policy instances
   */
  setContainerResolver(containerResolver?: ContainerResolver<any>): this {
    this.#containerResolver = containerResolver
    return this
  }

  /**
   * Execute an ability by reference
   *
   * @param ability Ability instance to execute
   * @param args Arguments to pass to the ability
   *
   * @example
   * ```js
   * const result = await bouncer.execute(editPostAbility, post)
   * ```
   */
  execute<Ability extends BouncerAbility<User>>(
    ability: Ability,
    ...args: Ability extends {
      original: (
        user: User,
        ...args: infer Args
      ) => AuthorizerResponse | Promise<AuthorizerResponse>
    }
      ? Args
      : never
  ): Promise<AuthorizationResponse>

  /**
   * Execute an ability from the list of pre-defined abilities
   *
   * @param ability Name of the pre-defined ability
   * @param args Arguments to pass to the ability
   *
   * @example
   * ```js
   * const result = await bouncer.execute('editPost', post)
   * ```
   */
  execute<Ability extends NarrowAbilitiesForAUser<User, Abilities>>(
    ability: Ability,
    ...args: Abilities[Ability] extends {
      original: (
        user: User,
        ...args: infer Args
      ) => AuthorizerResponse | Promise<AuthorizerResponse>
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
   *
   * @param ability Ability instance to check
   * @param args Arguments to pass to the ability
   *
   * @example
   * ```js
   * const canEdit = await bouncer.allows(editPostAbility, post)
   * ```
   */
  allows<Ability extends BouncerAbility<User>>(
    ability: Ability,
    ...args: Ability extends {
      original: (
        user: User,
        ...args: infer Args
      ) => AuthorizerResponse | Promise<AuthorizerResponse>
    }
      ? Args
      : never
  ): Promise<boolean>

  /**
   * Check if a user is allowed to perform an action using
   * the ability from the pre-defined list of abilities
   *
   * @param ability Name of the pre-defined ability
   * @param args Arguments to pass to the ability
   *
   * @example
   * ```js
   * const canEdit = await bouncer.allows('editPost', post)
   * ```
   */
  allows<Ability extends NarrowAbilitiesForAUser<User, Abilities>>(
    ability: Ability,
    ...args: Abilities[Ability] extends {
      original: (
        user: User,
        ...args: infer Args
      ) => AuthorizerResponse | Promise<AuthorizerResponse>
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
   *
   * @param action Ability instance to check
   * @param args Arguments to pass to the ability
   *
   * @example
   * ```js
   * const cannotEdit = await bouncer.denies(editPostAbility, post)
   * ```
   */
  denies<Action extends BouncerAbility<User>>(
    action: Action,
    ...args: Action extends {
      original: (
        user: User,
        ...args: infer Args
      ) => AuthorizerResponse | Promise<AuthorizerResponse>
    }
      ? Args
      : never
  ): Promise<boolean>

  /**
   * Check if a user is denied from performing an action using
   * the ability from the pre-defined list of abilities
   *
   * @param action Name of the pre-defined ability
   * @param args Arguments to pass to the ability
   *
   * @example
   * ```js
   * const cannotEdit = await bouncer.denies('editPost', post)
   * ```
   */
  denies<Action extends NarrowAbilitiesForAUser<User, Abilities>>(
    action: Action,
    ...args: Abilities[Action] extends {
      original: (
        user: User,
        ...args: infer Args
      ) => AuthorizerResponse | Promise<AuthorizerResponse>
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
   * @param action Ability instance to authorize
   * @param args Arguments to pass to the ability
   * @throws E_AUTHORIZATION_FAILURE
   *
   * @example
   * ```js
   * await bouncer.authorize(editPostAbility, post)
   * ```
   */
  authorize<Action extends BouncerAbility<User>>(
    action: Action,
    ...args: Action extends {
      original: (
        user: User,
        ...args: infer Args
      ) => AuthorizerResponse | Promise<AuthorizerResponse>
    }
      ? Args
      : never
  ): Promise<void>

  /**
   * Authorize a user against a given ability
   *
   * @param ability Name of the pre-defined ability
   * @param args Arguments to pass to the ability
   * @throws E_AUTHORIZATION_FAILURE
   *
   * @example
   * ```js
   * await bouncer.authorize('editPost', post)
   * ```
   */
  authorize<Ability extends NarrowAbilitiesForAUser<User, Abilities>>(
    ability: Ability,
    ...args: Abilities[Ability] extends {
      original: (
        user: User,
        ...args: infer Args
      ) => AuthorizerResponse | Promise<AuthorizerResponse>
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
   * Create AuthorizationResponse to deny access
   *
   * @param message Denial message
   * @param status Optional HTTP status code
   *
   * @example
   * ```js
   * return bouncer.deny('Access denied', 403)
   * ```
   */
  deny(message: string, status?: number) {
    return AuthorizationResponse.deny(message, status)
  }
}
