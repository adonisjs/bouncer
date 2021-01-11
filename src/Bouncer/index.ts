/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import {
	ActionOptions,
	ActionHandler,
	BouncerContract,
	AfterHookHandler,
	BeforeHookHandler,
} from '@ioc:Adonis/Addons/Bouncer'
import { ActionsAuthorizer } from '../ActionsAuthorizer'

/**
 * Bouncer exposes the API for registering authorization actions and policies
 */
export class Bouncer implements BouncerContract<any> {
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
	 * Set of registered hooks
	 */
	public hooks: BouncerContract<any>['hooks'] = {
		before: [],
		after: [],
	}

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
		action: Action,
		handler: ActionHandler,
		options?: ActionOptions
	): any {
		if (typeof handler !== 'function') {
			throw new Error(`Invalid handler for "${action}" action. Must be function`)
		}

		this.actions[action] = { handler, options }
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
}
