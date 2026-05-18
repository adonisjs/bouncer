/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { RuntimeException } from '@adonisjs/core/exceptions'
import type { EmitterLike } from '@adonisjs/core/types/events'
import type { ContainerResolver } from '@adonisjs/core/container'
import { type Constructor, type LazyImport } from '@adonisjs/core/types/common'

import debug from './debug.ts'
import { type BasePolicy } from './base_policy.ts'
import { E_AUTHORIZATION_FAILURE } from './errors.ts'
import { AuthorizationResponse } from './response.ts'
import type {
  BouncerEvents,
  ResponseBuilder,
  GetPolicyMethods,
  AuthorizerResponse,
} from './types.ts'

/**
 * Map of known policies, so that we can avoid re-importing them
 * for every use
 */
const KNOWN_POLICIES_CACHE: Map<Function, Constructor<any>> = new Map()

/**
 * Exposes the API to authorize a user using a pre-defined policy.
 * PolicyAuthorizer handles the execution of policy methods and manages
 * policy lifecycle including before/after hooks.
 *
 * @example
 * ```js
 * const authorizer = new PolicyAuthorizer(user, PostPolicy, responseBuilder)
 * const canEdit = await authorizer.allows('edit', post)
 * await authorizer.authorize('delete', post)
 * ```
 */
export class PolicyAuthorizer<
  User extends Record<string, string>,
  Policy extends Constructor<any>,
> {
  /**
   * Cached policy class reference
   */
  #policy?: Policy

  /**
   * Policy importer function or direct policy class reference
   */
  #policyImporter: LazyImport<Policy> | Policy

  /**
   * Reference to the resolved user
   */
  #user?: User | null

  /**
   * Reference to the IoC container resolver. It is needed
   * to optionally construct policy class instances
   */
  #containerResolver?: ContainerResolver<any>

  /**
   * Emitter to emit events
   */
  #emitter?: EmitterLike<BouncerEvents>

  /**
   * Response builder is used to normalize bouncer responses
   */
  #responseBuilder: ResponseBuilder

  /**
   * Create a new PolicyAuthorizer instance
   *
   * @param user User object or null for guest
   * @param policy Policy class or lazy import function
   * @param responseBuilder Function to normalize authorization responses
   */
  constructor(
    user: User | null,
    policy: LazyImport<Policy> | Policy,
    responseBuilder: ResponseBuilder
  ) {
    this.#user = user
    this.#policyImporter = policy
    this.#responseBuilder = responseBuilder
  }

  /**
   * Check if a policy method allows guest users
   *
   * @param Policy Policy class to check
   * @param action Method name to check
   */
  #policyAllowsGuests(Policy: Constructor<any>, action: string): boolean {
    const actionsMetaData =
      'actionsMetaData' in Policy &&
      (Policy.actionsMetaData as (typeof BasePolicy)['actionsMetaData'])

    if (!actionsMetaData || !actionsMetaData[action]) {
      return false
    }

    return !!actionsMetaData[action].allowGuest
  }

  /**
   * Check to see if policy is defined as a class
   */
  #isPolicyAClass(policy: LazyImport<Policy> | Policy): policy is Policy {
    return typeof policy === 'function' && /^class(\s+|{)/.test(policy.toString())
  }

  /**
   * Resolves the policy from the importer and caches it for
   * repetitive use.
   */
  async #resolvePolicy(): Promise<Constructor<any>> {
    /**
     * Prefer local reference (if exists)
     */
    if (this.#policy && !('hot' in import.meta)) {
      return this.#policy
    }

    /**
     * Read from cache if exists
     */
    if (KNOWN_POLICIES_CACHE.has(this.#policyImporter)) {
      debug('reading policy from the imports cache %O', this.#policyImporter)
      this.#policy = KNOWN_POLICIES_CACHE.get(this.#policyImporter)! as Policy
      return this.#policy
    }

    /**
     * Import policy using the importer if a lazy import function
     * is provided, otherwise we consider policy to be a class
     */
    const policyOrImport = this.#policyImporter
    if (this.#isPolicyAClass(policyOrImport)) {
      this.#policy = policyOrImport
    } else {
      debug('lazily importing policy %O', this.#policyImporter)
      const policyExports = await policyOrImport()
      this.#policy = policyExports.default
    }

    /**
     * Cache the resolved value
     */
    if (!('hot' in import.meta)) {
      KNOWN_POLICIES_CACHE.set(this.#policyImporter, this.#policy)
    }
    return this.#policy
  }

  /**
   * Emits the event and sends normalized response
   */
  #emitAndRespond(action: any, result: boolean | AuthorizationResponse, args: any[]) {
    const response = this.#responseBuilder(result)
    if (this.#emitter) {
      this.#emitter.emit('authorization:finished', {
        user: this.#user,
        action: `${this.#policy?.name}.${action}`,
        response,
        parameters: args,
      })
    }

    return response
  }

  /**
   * Executes the after hook on policy and handles various
   * flows around using original or modified response.
   */
  async #executeAfterHook(
    policy: any,
    action: any,
    result: boolean | AuthorizationResponse,
    args: any[]
  ): Promise<AuthorizationResponse> {
    /**
     * Return the action response when no after is defined
     */
    if (typeof policy.after !== 'function') {
      return this.#emitAndRespond(action, result, args)
    }

    const modifiedResponse = await policy.after(this.#user, action, result, ...args)

    /**
     * If modified response is a valid authorizer response, when use that
     * modified response
     */
    if (
      typeof modifiedResponse === 'boolean' ||
      modifiedResponse instanceof AuthorizationResponse
    ) {
      return this.#emitAndRespond(action, modifiedResponse, args)
    }

    /**
     * Otherwise fallback to original response
     */
    return this.#emitAndRespond(action, result, args)
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
   * Define the event emitter instance to use for emitting
   * authorization events
   *
   * @param emitter Event emitter instance
   */
  setEmitter(emitter?: EmitterLike<BouncerEvents>): this {
    this.#emitter = emitter
    return this
  }

  /**
   * Execute an action from the list of pre-defined actions
   *
   * @param action Policy method name to execute
   * @param args Arguments to pass to the policy method
   *
   * @example
   * ```js
   * const result = await authorizer.execute('edit', post)
   * ```
   */
  async execute<Method extends GetPolicyMethods<User, InstanceType<Policy>>>(
    action: Method,
    ...args: InstanceType<Policy>[Method] extends (
      user: User,
      ...args: infer Args
    ) => AuthorizerResponse | Promise<AuthorizerResponse>
      ? Args
      : never
  ): Promise<AuthorizationResponse> {
    const Policy = await this.#resolvePolicy()

    /**
     * Create an instance of the class either using the container
     * resolver or manually.
     */
    const policyInstance = this.#containerResolver
      ? await this.#containerResolver.make(Policy)
      : new Policy()

    /**
     * Ensure the method exists on the policy class otherwise
     * raise an exception
     */
    if (typeof policyInstance[action] !== 'function') {
      throw new RuntimeException(
        `Cannot find method "${action as string}" on "[class ${Policy.name}]"`
      )
    }

    /**
     * Execute before hook and shortcircuit if before hook returns
     * a valid authorizer response
     */
    let hookResponse: unknown
    if (typeof policyInstance.before === 'function') {
      hookResponse = await policyInstance.before(this.#user, action, ...args)
    }
    if (typeof hookResponse === 'boolean' || hookResponse instanceof AuthorizationResponse) {
      return this.#executeAfterHook(policyInstance, action, hookResponse, args)
    }

    /**
     * Disallow action for guest users
     */
    if (this.#user === null && !this.#policyAllowsGuests(Policy, action as string)) {
      return this.#executeAfterHook(policyInstance, action, AuthorizationResponse.deny(), args)
    }

    /**
     * Invoke action manually and normalize its response
     */
    const response = await policyInstance[action](this.#user, ...args)
    return this.#executeAfterHook(policyInstance, action, response, args)
  }

  /**
   * Check if a user is allowed to perform an action using
   * one of the known policy methods
   *
   * @param action Policy method name to check
   * @param args Arguments to pass to the policy method
   *
   * @example
   * ```js
   * const canEdit = await authorizer.allows('edit', post)
   * ```
   */
  async allows<Method extends GetPolicyMethods<User, InstanceType<Policy>>>(
    action: Method,
    ...args: InstanceType<Policy>[Method] extends (
      user: User,
      ...args: infer Args
    ) => AuthorizerResponse | Promise<AuthorizerResponse>
      ? Args
      : never
  ): Promise<boolean> {
    const response = await this.execute(action, ...args)
    return response.authorized
  }

  /**
   * Check if a user is denied from performing an action using
   * one of the known policy methods
   *
   * @param action Policy method name to check
   * @param args Arguments to pass to the policy method
   *
   * @example
   * ```js
   * const cannotEdit = await authorizer.denies('edit', post)
   * ```
   */
  async denies<Method extends GetPolicyMethods<User, InstanceType<Policy>>>(
    action: Method,
    ...args: InstanceType<Policy>[Method] extends (
      user: User,
      ...args: infer Args
    ) => AuthorizerResponse | Promise<AuthorizerResponse>
      ? Args
      : never
  ): Promise<boolean> {
    const response = await this.execute(action, ...args)
    return !response.authorized
  }

  /**
   * Authorize a user against a given policy action
   *
   * @param action Policy method name to authorize
   * @param args Arguments to pass to the policy method
   * @throws E_AUTHORIZATION_FAILURE
   *
   * @example
   * ```js
   * await authorizer.authorize('edit', post)
   * ```
   */
  async authorize<Method extends GetPolicyMethods<User, InstanceType<Policy>>>(
    action: Method,
    ...args: InstanceType<Policy>[Method] extends (
      user: User,
      ...args: infer Args
    ) => AuthorizerResponse | Promise<AuthorizerResponse>
      ? Args
      : never
  ): Promise<void> {
    const response = await this.execute(action, ...args)
    if (!response.authorized) {
      throw new E_AUTHORIZATION_FAILURE(response)
    }
  }
}
