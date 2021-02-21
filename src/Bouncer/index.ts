/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { BasePolicyContract } from '@ioc:Adonis/Addons/Bouncer'

import {
  LazyPolicy,
  ActionOptions,
  ActionHandler,
  BouncerContract,
  AfterHookHandler,
  BeforeHookHandler,
  BasePolicyConstructorContract,
} from '@ioc:Adonis/Addons/Bouncer'

import { action } from '../Decorators'
import { BasePolicy } from '../BasePolicy'
import { ActionsAuthorizer } from '../ActionsAuthorizer'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

/**
 * Bouncer exposes the API for registering authorization actions and policies
 */
export class Bouncer implements BouncerContract<any, any> {
  /**
   * A set of resolved policies. This is to avoid re-importing the same
   * policies again and again
   */
  private resolvedPolicies: {
    [key: string]: BasePolicyConstructorContract
  } = {}

  /**
   * Set of registered actions
   */
  public actions: {
    [key: string]: {
      handler: ActionHandler
      options?: ActionOptions
    }
  } = {}

  /**
   * Set of registered policies
   */
  public policies: { [key: string]: LazyPolicy } = {}

  /**
   * Set of registered hooks
   */
  public hooks: BouncerContract<any, any>['hooks'] = {
    before: [],
    after: [],
  }

  /**
   * Reference to the base policy
   */
  public BasePolicy = BasePolicy
  public action = action

  constructor(private application: ApplicationContract) {}

  /**
   * Register a before hook
   */
  public before(callback: BeforeHookHandler): this {
    this.hooks.before.push(callback)
    return this
  }

  /**
   * Register an after hook
   */
  public after(callback: AfterHookHandler): this {
    this.hooks.after.push(callback)
    return this
  }

  /**
   * Define an authorization action
   */
  public define<Action extends string>(
    actionName: Action,
    handler: ActionHandler,
    options?: ActionOptions
  ): any {
    if (typeof handler !== 'function') {
      throw new Error(`Invalid handler for "${actionName}" action. Must be a function`)
    }

    this.actions[actionName] = { handler, options }
    return this
  }

  /**
   * Register policies
   */
  public registerPolicies(policies: { [key: string]: LazyPolicy }): any {
    Object.keys(policies).forEach((policy) => {
      if (typeof policies[policy] !== 'function') {
        throw new Error(
          `Invalid value for "${policy}" policy. Must be a function importing the policy class`
        )
      }
    })

    this.policies = policies
    return this
  }

  /**
   * Returns the authorizer for a given user
   */
  public forUser(user: any) {
    return new ActionsAuthorizer(user, this)
  }

  /**
   * Deny authorization check using a custom message and status
   */
  public deny(message: string, status?: number): [string, number] {
    return [message, status || 403]
  }

  /**
   * Resolve policy from the set of pre-registered policies
   */
  public async resolvePolicy(policy: string): Promise<BasePolicyContract> {
    /**
     * Return pre-resolved policy
     */
    if (this.resolvedPolicies[policy]) {
      return this.application.container.makeAsync(this.resolvedPolicies[policy])
    }

    /**
     * Ensure policy is registered
     */
    if (typeof this.policies[policy] !== 'function') {
      throw new Error(
        `Cannot use "${policy}" policy. Make sure it is defined as a function inside "start/bouncer" file`
      )
    }

    const policyExport = await this.policies[policy]()

    /**
     * Ensure policy has a default export
     */
    if (!policyExport || !policyExport.default) {
      throw new Error(
        `Invalid "${policy}" policy. Make sure to export default the policy implementation`
      )
    }

    policyExport.default.boot()
    return this.application.container.makeAsync(policyExport.default)
  }
}
