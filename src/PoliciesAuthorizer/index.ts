/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { ProfilerContract, ProfilerRowContract } from '@ioc:Adonis/Core/Profiler'
import {
  PoliciesList,
  BasePolicyContract,
  AuthorizationResult,
  PoliciesAuthorizerContract,
  BasePolicyConstructorContract,
} from '@ioc:Adonis/Addons/Bouncer'

import { Bouncer } from '../Bouncer'
import { AuthorizationProfiler } from '../Profiler'
import { normalizeActionResponse, normalizeHookResponse } from '../utils'
import { AuthorizationException } from '../Exceptions/AuthorizationException'

/**
 * Exposes the API to authorize actions using a policy class
 */
export class PoliciesAuthorizer implements PoliciesAuthorizerContract<any, keyof PoliciesList> {
  /**
   * An optional profiler instance to profile the actions. Usually it will
   * be an instance of the current HTTP request profiler
   */
  private profiler?: ProfilerRowContract | ProfilerContract

  /**
   * The instance of the policy class. We need to resolve it only
   * once per authorizer instance
   */
  private policyInstance: BasePolicyContract

  /**
   * We lookup the user lazily using the "userOrResolver" property. This
   * allows the class consumer to provide the user after creating
   * the authorizer instance.
   *
   * We stop calling the resolver, once we receive the user instance.
   */
  public user: any
  constructor(private userOrResolver: any, private bouncer: Bouncer, private policy: string) {}

  /**
   * Resolve policy
   */
  private async resolvePolicy() {
    if (this.policyInstance) {
      return
    }
    this.policyInstance = await this.bouncer.resolvePolicy(this.policy)
  }

  /**
   * Resolve the user from the userOrResolver
   * property
   */
  private resolveUser() {
    if (this.user) {
      return
    }

    if (typeof this.userOrResolver === 'function') {
      this.user = this.userOrResolver()
    } else {
      this.user = this.userOrResolver
    }
  }

  /**
   * Run before/after hooks for a given lifecycle phase
   */
  private async runHooks(
    lifecycle: 'before' | 'after',
    action: string,
    result: null | AuthorizationResult,
    args: any[],
    profiler: AuthorizationProfiler
  ): Promise<{ status: 'skipped' | 'authorized' | 'unauthorized' }> {
    if (typeof this.policyInstance[lifecycle] !== 'function') {
      return { status: 'skipped' as const }
    }

    const response = await profiler.profileFunction(
      'bouncer:hook',
      { lifecycle, action, handler: lifecycle },
      this.policyInstance[lifecycle].bind(this.policyInstance),
      lifecycle === 'before' ? [this.user, action, ...args] : [this.user, action, result!, ...args]
    )

    return normalizeHookResponse(response)
  }

  /**
   * Run the action
   */
  private async runAction(action: string, args: any[], profiler: AuthorizationProfiler) {
    if (typeof this.policyInstance[action] !== 'function') {
      throw new Error(
        `Cannot run "${action}" action. Make sure it is defined on the "${this.policy}" class`
      )
    }

    const Policy = this.policyInstance.constructor as BasePolicyConstructorContract
    const options = Policy.actionsOptions[action]
    const allowGuest = options && options.allowGuest

    /**
     * Disallow when user is missing and guest is not allowed
     */
    if (!this.user && !allowGuest) {
      return normalizeActionResponse(false)
    }

    /**
     * Execute action and profile it
     */
    const response = await profiler.profileFunction(
      'bouncer:action',
      { action, handler: action },
      this.policyInstance[action].bind(this.policyInstance),
      [this.user, ...args]
    )

    return normalizeActionResponse(response)
  }

  /**
   * Run the authorization action
   */
  private async authorizeAction(action: string, args: any[]) {
    const profiler = new AuthorizationProfiler('bouncer:authorize', this.profiler, {
      action,
      policy: this.policy,
    })

    try {
      /**
       * Run before hooks and return the result if status is not "skipped"
       */
      const { status: beforeStatus } = await this.runHooks('before', action, null, args, profiler)
      if (beforeStatus !== 'skipped') {
        return profiler.end(normalizeActionResponse(beforeStatus === 'authorized' ? true : false))
      }

      /**
       * Run action handler
       */
      const result = await this.runAction(action, args, profiler)

      /**
       * Run after hooks and return the result if status is not "skipped"
       */
      const { status: afterStatus } = await this.runHooks('after', action, result, args, profiler)
      if (afterStatus !== 'skipped') {
        return profiler.end(normalizeActionResponse(afterStatus === 'authorized' ? true : false))
      }

      return profiler.end(result)
    } catch (error) {
      profiler.end({
        authorized: false,
        errorMessage: null,
        error,
      })

      throw error
    }
  }

  /**
   * Set profiler instance to be used for profiling calls
   */
  public setProfiler(profiler?: ProfilerRowContract | ProfilerContract) {
    this.profiler = profiler
    return this
  }

  /**
   * Find if a user is allowed to perform the action
   */
  public async allows(action: string, ...args: any[]) {
    await this.resolvePolicy()
    this.resolveUser()
    const { authorized } = await this.authorizeAction(action, args)
    return authorized === true
  }

  /**
   * Find if a user is not allowed to perform the action
   */
  public async denies(action: string, ...args: any[]) {
    await this.resolvePolicy()
    this.resolveUser()
    const { authorized } = await this.authorizeAction(action, args)
    return authorized === false
  }

  /**
   * Authorize user against the given action
   */
  public async authorize(action: string, ...args: any[]) {
    await this.resolvePolicy()
    this.resolveUser()

    const { authorized, errorResponse } = await this.authorizeAction(action, args)
    if (authorized) {
      return
    }

    throw AuthorizationException.raise(errorResponse![0], errorResponse![1])
  }

  /**
   * Create a new authorizer instance for a given user
   */
  public forUser(userOrResolver: any) {
    return new PoliciesAuthorizer(userOrResolver, this.bouncer, this.policy).setProfiler(
      this.profiler
    )
  }
}
