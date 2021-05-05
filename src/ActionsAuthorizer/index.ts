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
import { ActionsAuthorizerContract, AuthorizationResult } from '@ioc:Adonis/Addons/Bouncer'

import { Bouncer } from '../Bouncer'
import { Exception } from '@poppinss/utils'
import { AuthorizationProfiler } from '../Profiler'
import { PoliciesAuthorizer } from '../PoliciesAuthorizer'
import { AuthorizationException } from '../Exceptions/AuthorizationException'
import { hookHasHandledTheRequest, normalizeActionResponse, normalizeHookResponse } from '../utils'

/**
 * Exposes the API to authorize actions
 */
export class ActionsAuthorizer implements ActionsAuthorizerContract<any> {
  /**
   * An optional profiler instance to profile the actions. Usually it will
   * be an instance of the current HTTP request profiler
   */
  private profiler?: ProfilerRowContract | ProfilerContract

  constructor(public user: any, private bouncer: Bouncer) {}

  /**
   * Run all hooks for a given lifecycle phase
   */
  private async runHooks(
    lifecycle: 'before' | 'after',
    action: string,
    result: null | AuthorizationResult,
    args: any[],
    profiler: AuthorizationProfiler
  ): Promise<{ status: 'skipped' | 'authorized' | 'unauthorized' }> {
    let response: any

    for (let hook of this.bouncer.hooks[lifecycle]) {
      /**
       * Execute hook
       */
      response = await profiler.profileFunction(
        'bouncer:hook',
        { lifecycle, action, handler: hook.name || 'anonymous' },
        hook,
        lifecycle === 'before'
          ? [this.user, action, ...args]
          : [this.user, action, result!, ...args]
      )

      /**
       * Short circuit when response is not undefined or null. Meaning the
       * hook has decided to take over the request
       */
      if (hookHasHandledTheRequest(response)) {
        break
      }
    }

    return normalizeHookResponse(response)
  }

  /**
   * Run the action
   */
  private async runAction(action: string, args: any[], profiler: AuthorizationProfiler) {
    /**
     * We should explicitly raise an exception when the action is not defined.
     */
    if (!this.bouncer.actions[action]) {
      throw new Error(
        `Cannot run "${action}" action. Make sure it is defined inside the "start/bouncer" file`
      )
    }

    const { handler, options } = this.bouncer.actions[action]
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
      { action, handler: handler.name || 'anonymous' },
      handler,
      [this.user, ...args]
    )

    return normalizeActionResponse(response)
  }

  /**
   * Run the authorization action
   */
  private async authorizeAction(action: string, args: any[]) {
    const profiler = new AuthorizationProfiler('bouncer:authorize', this.profiler, { action })

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
   * Create a new authorizer instance for a given user
   */
  public forUser(user: any) {
    return new ActionsAuthorizer(user, this.bouncer).setProfiler(this.profiler)
  }

  /**
   * Returns an instance of the policies authorizer
   */
  public with(policy: string): any {
    return new PoliciesAuthorizer(this.user, this.bouncer, policy).setProfiler(this.profiler)
  }

  /**
   * Find if a user is allowed to perform the action
   */
  public async allows(action: string, ...args: any[]) {
    const { authorized } = await this.authorizeAction(action, args)
    return authorized === true
  }

  /**
   * Find if a user is not allowed to perform the action
   */
  public async denies(action: string, ...args: any[]) {
    const { authorized } = await this.authorizeAction(action, args)
    return authorized === false
  }

  /**
   * Authorize user against the given action
   */
  public async authorize(action: string, ...args: any[]) {
    const { authorized, errorResponse } = await this.authorizeAction(action, args)

    if (authorized) {
      return
    }

    throw AuthorizationException.raise(errorResponse![0], errorResponse![1])
  }

  /**
   * The untyped version of [[this.allows]] and support references a policy.action
   * via string. Added mainly to be used inside the templates.
   *
   * For example:
   * ```
   * bouncer.can('PostPolicy.update', post)
   * ```
   */
  public async can(policyOrAction: string, ...args: any[]) {
    if (!policyOrAction) {
      throw new Exception('The "can" method expects action name as the first argument')
    }

    const tokens = policyOrAction.split('.')
    const usingCustomAuthorizer = args.length && args[0] instanceof ActionsAuthorizer

    if (tokens.length > 1) {
      return usingCustomAuthorizer
        ? args[0].with(tokens.shift()!).allows(tokens.join('.'), ...args.slice(1))
        : this.with(tokens.shift()!).allows(tokens.join('.'), ...args)
    }

    return usingCustomAuthorizer
      ? args[0].allows(tokens.join('.'), ...args.slice(1))
      : this.allows(tokens.join('.'), ...args)
  }

  /**
   * The untyped version of [[this.denies]] and support references a policy.action
   * via string. Added mainly to be used inside the templates.
   *
   * For example:
   * ```
   * bouncer.cannot('PostPolicy.update', post)
   * ```
   */
  public async cannot(policyOrAction: string, ...args: any[]) {
    if (!policyOrAction) {
      throw new Exception('The "cannot" method expects action name as the first argument')
    }

    const tokens = policyOrAction.split('.')
    const usingCustomAuthorizer = args.length && args[0] instanceof ActionsAuthorizer

    if (tokens.length > 1) {
      return usingCustomAuthorizer
        ? args[0].with(tokens.shift()!).denies(tokens.join('.'), ...args.slice(1))
        : this.with(tokens.shift()!).denies(tokens.join('.'), ...args)
    }

    return usingCustomAuthorizer
      ? args[0].denies(tokens.join('.'), ...args.slice(1))
      : this.denies(tokens.join('.'), ...args)
  }
}
