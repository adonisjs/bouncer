/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import { RuntimeException } from '@poppinss/utils'
import type { EmitterLike } from '@adonisjs/core/types/events'
import type { ContainerResolver } from '@adonisjs/core/container'

import debug from './debug.js'
import { BasePolicy } from './base_policy.js'
import { E_AUTHORIZATION_FAILURE } from './errors.js'
import { AuthorizationResponse } from './response.js'
import type {
  LazyImport,
  Constructor,
  BouncerEvents,
  ResponseBuilder,
  GetPolicyMethods,
  AuthorizerResponse,
} from './types.js'

/**
 * Map of known policies, so that we can avoid re-importing them
 * for every use
 */
const KNOWN_POLICIES_CACHE: Map<Function, Constructor<any>> = new Map()

/**
 * Exposes the API to authorize a user using a pre-defined policy
 */
export class PolicyAuthorizer<
  User extends Record<string, string>,
  Policy extends Constructor<any>,
> {
  #policy?: Policy
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
  #isPolicyAsClass(policy: LazyImport<Policy> | Policy): policy is Policy {
    return typeof policy === 'function' && policy.toString().startsWith('class ')
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
    if (KNOWN_POLICIES_CACHE.has(this.#policyImporter) && !('hot' in import.meta)) {
      debug('reading policy from the imports cache %O', this.#policyImporter)
      return KNOWN_POLICIES_CACHE.get(this.#policyImporter)!
    }

    /**
     * Import policy using the importer if a lazy import function
     * is provided, otherwise we consider policy to be a class
     */
    const policyOrImport = this.#policyImporter
    if (this.#isPolicyAsClass(policyOrImport)) {
      this.#policy = policyOrImport
    } else {
      debug('lazily importing policy %O', this.#policyImporter)
      const policyExports = await policyOrImport()
      this.#policy = policyExports.default
    }

    /**
     * Cache the resolved value
     */
    KNOWN_POLICIES_CACHE.set(this.#policyImporter, this.#policy)
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
   */
  setContainerResolver(containerResolver?: ContainerResolver<any>): this {
    this.#containerResolver = containerResolver
    return this
  }

  /**
   * Define the event emitter instance to use for emitting
   * authorization events
   */
  setEmitter(emitter?: EmitterLike<BouncerEvents>): this {
    this.#emitter = emitter
    return this
  }

  /**
   * Execute an action from the list of pre-defined actions
   */
  async execute<Method extends GetPolicyMethods<User, InstanceType<Policy>>>(
    action: Method,
    ...args: InstanceType<Policy>[Method] extends (
      user: User,
      ...args: infer Args
    ) => AuthorizerResponse
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
   */
  async allows<Method extends GetPolicyMethods<User, InstanceType<Policy>>>(
    action: Method,
    ...args: InstanceType<Policy>[Method] extends (
      user: User,
      ...args: infer Args
    ) => AuthorizerResponse
      ? Args
      : never
  ): Promise<boolean> {
    const response = await this.execute(action, ...args)
    return response.authorized
  }

  /**
   * Check if a user is denied from performing an action using
   * one of the known policy methods
   */
  async denies<Method extends GetPolicyMethods<User, InstanceType<Policy>>>(
    action: Method,
    ...args: InstanceType<Policy>[Method] extends (
      user: User,
      ...args: infer Args
    ) => AuthorizerResponse
      ? Args
      : never
  ): Promise<boolean> {
    const response = await this.execute(action, ...args)
    return !response.authorized
  }

  /**
   * Authorize a user against a given policy action
   *
   * @throws {@link E_AUTHORIZATION_FAILURE}
   */
  async authorize<Method extends GetPolicyMethods<User, InstanceType<Policy>>>(
    action: Method,
    ...args: InstanceType<Policy>[Method] extends (
      user: User,
      ...args: infer Args
    ) => AuthorizerResponse
      ? Args
      : never
  ): Promise<void> {
    const response = await this.execute(action, ...args)
    if (!response.authorized) {
      throw new E_AUTHORIZATION_FAILURE(response)
    }
  }
}
