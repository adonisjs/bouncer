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

import { action as createAction } from './action.js'
import { AuthorizationResponse } from './response.js'
import {
  Constructor,
  BouncerAction,
  GetPolicyMethods,
  AuthorizerResponse,
  NarrowActionsForAUser,
  LazyImport,
} from './types.js'
import { BasePolicy } from './base_policy.js'

/**
 * Bouncer exposes the API to evaluate bouncer actions and policies to
 * verify if a user is authorized to perform the given action
 */
export class Bouncer<
  User extends Record<any, any>,
  Actions extends Record<string, BouncerAction<any>> | undefined = undefined,
  Policies extends Record<string, LazyImport<BasePolicy>> | undefined = undefined,
> {
  /**
   * Define a bouncer action from a callback
   */
  static action = createAction

  /**
   * User resolver to lazily resolve the user
   */
  #userOrResolver: User | (() => User | null) | null

  /**
   * Reference to the resolved user
   */
  #user?: User | null

  /**
   * Pre-defined actions
   */
  #actions?: Actions

  /**
   * A set of policies we already know are classes. Just
   * to avoid the class check
   */
  #knownPolicies: Set<Constructor<any>> = new Set()

  /**
   * Reference to the IoC container resolver. It is needed
   * to optionally construct policy class instances
   */
  #containerResolver?: ContainerResolver<any>

  constructor(userOrResolver: User | (() => User | null) | null, actions?: Actions) {
    this.#userOrResolver = userOrResolver
    this.#actions = actions
  }

  /**
   * Set a container resolver to use for resolving policies
   */
  setContainerResolver(containerResolver: ContainerResolver<any>) {
    this.#containerResolver = containerResolver
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
   * Check if the policy reference is a class constructor
   */
  #isAClass(Policy: unknown): Policy is Constructor<any> {
    if (this.#knownPolicies.has(Policy as any)) {
      return true
    }
    return typeof Policy === 'function' && Policy.toString().startsWith('class ')
  }

  /**
   * Check if a policy method allows guest users
   */
  #policyAllowsGuests(Policy: Constructor<any>, action: string): boolean {
    if (!('actionsMetaData' in Policy)) {
      return false
    }

    const methodMetaData = (Policy.actionsMetaData as (typeof BasePolicy)['actionsMetaData'])[
      action
    ]
    if (!methodMetaData) {
      return false
    }

    return methodMetaData.allowGuest
  }

  /**
   * Executes a policy action from the policy class constructor and a
   * method on the class.
   */
  async #executePolicyAction(Policy: unknown, action: string, ...args: any[]) {
    /**
     * Ensure policy is a class constructor
     */
    if (!this.#isAClass(Policy)) {
      throw new RuntimeException('Invalid policy reference. It must be a class constructor')
    }

    /**
     * Create an instance of the class either using the container
     * resolver or manually.
     */
    const policyInstance = this.#containerResolver
      ? await this.#containerResolver.make(Policy)
      : new Policy()

    /**
     * Ensure the method exists on the policy class instead
     */
    if (typeof policyInstance[action] !== 'function') {
      throw new RuntimeException(`Cannot find method "${action}" on "[class ${Policy.name}]"`)
    }

    const user = this.#getUser()

    /**
     * Disallow action for guest users
     */
    if (user === null && !this.#policyAllowsGuests(Policy, action)) {
      return new AuthorizationResponse(false)
    }

    /**
     * Invoke action manually and normalize its response
     */
    const response = await policyInstance[action](user, ...args)
    return typeof response === 'boolean' ? new AuthorizationResponse(response) : response
  }

  /**
   * Execute an action from a policy class. The policy will be
   * constructed using the AdonisJS IoC container
   */
  execute<
    Policy extends Constructor<BasePolicy>,
    Method extends GetPolicyMethods<User, InstanceType<Policy>>,
  >(
    action: [Policy, Method],
    ...args: InstanceType<Policy>[Method] extends (
      user: User,
      ...args: infer Args
    ) => AuthorizerResponse
      ? Args
      : never
  ): Promise<AuthorizationResponse>

  /**
   * Execute an action by reference
   */
  execute<Action extends BouncerAction<User>>(
    action: Action,
    ...args: Action extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<AuthorizationResponse>

  /**
   * Execute an action from the list of pre-defined actions
   */
  execute<Action extends NarrowActionsForAUser<User, Actions>>(
    action: Action,
    ...args: Actions[Action] extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<AuthorizationResponse>

  async execute(action: any, ...args: any[]): Promise<AuthorizationResponse> {
    /**
     * Executing action from a pre-defined list of actions
     */
    if (this.#actions && this.#actions[action]) {
      return this.#actions[action].execute(this.#getUser(), ...args)
    }

    /**
     * Executing policy action
     */
    if (Array.isArray(action)) {
      return this.#executePolicyAction(action[0], action[1], ...args)
    }

    /**
     * Ensure value is an action reference or throw error
     */
    if (!action || typeof action !== 'object' || 'execute' in action === false) {
      throw new RuntimeException(`Invalid bouncer action ${inspect(action)}`)
    }

    /**
     * Executing action by reference
     */
    return await (action as BouncerAction<User>).execute(this.#getUser(), ...args)
  }

  /**
   * Check if a user is allowed to perform a policy action. The policy will be
   * constructed using the AdonisJS IoC container
   */
  allows<
    Policy extends Constructor<BasePolicy>,
    Method extends GetPolicyMethods<User, InstanceType<Policy>>,
  >(
    action: [Policy, Method],
    ...args: InstanceType<Policy>[Method] extends (
      user: User,
      ...args: infer Args
    ) => AuthorizerResponse
      ? Args
      : never
  ): Promise<boolean>

  /**
   * Check if a user is allowed to perform an action provided
   * as a reference
   */
  allows<Action extends BouncerAction<User>>(
    action: Action,
    ...args: Action extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<boolean>

  /**
   * Check if a user is allowed to perform an action
   * from the list of pre-defined actions
   */
  allows<Action extends NarrowActionsForAUser<User, Actions>>(
    action: Action,
    ...args: Actions[Action] extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<boolean>
  async allows(action: any, ...args: any[]): Promise<boolean> {
    const response = await this.execute(action, ...args)
    return response.authorized
  }

  /**
   * Check if a user is denied from performing a policy action. The policy will be
   * constructed using the AdonisJS IoC container
   */
  denies<
    Policy extends Constructor<BasePolicy>,
    Method extends GetPolicyMethods<User, InstanceType<Policy>>,
  >(
    action: [Policy, Method],
    ...args: InstanceType<Policy>[Method] extends (
      user: User,
      ...args: infer Args
    ) => AuthorizerResponse
      ? Args
      : never
  ): Promise<boolean>

  /**
   * Check if a user is denied from performing an action provided
   * as a reference
   */
  denies<Action extends BouncerAction<User>>(
    action: Action,
    ...args: Action extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<boolean>

  /**
   * Check if a user is denied from performing an action
   * from the list of pre-defined actions
   */
  denies<Action extends NarrowActionsForAUser<User, Actions>>(
    action: Action,
    ...args: Actions[Action] extends {
      original: (user: User, ...args: infer Args) => AuthorizerResponse
    }
      ? Args
      : never
  ): Promise<boolean>
  async denies(action: any, ...args: any[]): Promise<boolean> {
    const response = await this.execute(action, ...args)
    return !response.authorized
  }
}
