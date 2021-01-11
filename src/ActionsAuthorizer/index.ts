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
	BeforeHookHandler,
	AuthorizationResult,
	ActionsAuthorizerContract,
} from '@ioc:Adonis/Addons/Bouncer'

import { Bouncer } from '../Bouncer'
import { UnauthorizedException } from '../Exceptions/UnAuthorizedException'

/**
 * Exposes the API to authorize actions
 */
export class ActionsAuthorizer implements ActionsAuthorizerContract<any> {
	constructor(public user: any, private bouncer: Bouncer) {}

	/**
	 * Run all hooks for a given lifecycle phase
	 */
	private async runHooks(
		lifecycle: 'before' | 'after',
		action: string,
		result: null | AuthorizationResult,
		...args: any[]
	) {
		let response: any = null

		for (let hook of this.bouncer.hooks[lifecycle]) {
			response =
				lifecycle === 'before'
					? await (hook as BeforeHookHandler)(this.user, action, ...args)
					: await hook(this.user, action, result!, ...args)

			/**
			 * Short circuit when response is not undefined or null. Meaning the
			 * hook as decided to take over the request
			 */
			if (response !== null && response !== undefined) {
				break
			}
		}

		return {
			status:
				response === null || response === undefined
					? ('skipped' as const)
					: response === true
					? ('authorized' as const)
					: ('unauthorized' as const),
		}
	}

	/**
	 * Run the action
	 */
	private async runAction(action: string, ...args: any[]) {
		const { handler, options } = this.bouncer.actions[action]
		const allowGuest = options && options.allowGuest

		/**
		 * Disallow when user is missing and guest is not allowed
		 */
		if (!this.user && !allowGuest) {
			return this.inspectActionResponse(false)
		}

		const response = await handler(this.user, ...args)
		return this.inspectActionResponse(response)
	}

	/**
	 * Inspect the action response to return a normalize authorization
	 * result
	 */
	private inspectActionResponse(response: any): AuthorizationResult {
		if (response === true) {
			return {
				authorized: true,
				errorResponse: null,
			}
		}

		if (Array.isArray(response) && response.length) {
			const [message, status] = response

			return {
				authorized: false,
				errorResponse: [message || 'Unauthorized Access', status || 403],
			}
		}

		return {
			authorized: false,
			errorResponse: ['Unauthorized Access', 403],
		}
	}

	/**
	 * Authorize a given action
	 */
	private async authorizeAction(action: string, ...args: any[]) {
		/**
		 * Note: This method should not handle exceptions raised by the action handler,
		 * since we want those exceptions to bubble up vs getting translated to
		 * an "Unauthorized access" response.
		 */

		/**
		 * Run before hooks and return the result if status is not "skipped"
		 */
		const { status: beforeStatus } = await this.runHooks('before', action, null, ...args)
		if (beforeStatus !== 'skipped') {
			return this.inspectActionResponse(beforeStatus === 'authorized' ? true : false)
		}

		/**
		 * Run action handler
		 */
		const result = await this.runAction(action, ...args)

		/**
		 * Run after hooks and return the result if status is not "skipped"
		 */
		const { status: afterStatus } = await this.runHooks('after', action, result, ...args)
		if (afterStatus !== 'skipped') {
			return this.inspectActionResponse(afterStatus === 'authorized' ? true : false)
		}

		return result
	}

	/**
	 * Find if a user is allowed to perform the action
	 */
	public async allows(action: string, ...args: any[]) {
		const { authorized } = await this.authorizeAction(action, ...args)
		return authorized === true
	}

	/**
	 * Find if a user is not allowed to perform the action
	 */
	public async denies(action: string, ...args: any[]) {
		const { authorized } = await this.authorizeAction(action, ...args)
		return authorized === false
	}

	/**
	 * Authorize user against the given action
	 */
	public async authorize(action: string, ...args: any[]) {
		const { authorized, errorResponse } = await this.authorizeAction(action, ...args)
		if (authorized) {
			return
		}

		throw UnauthorizedException.raise(errorResponse![0], errorResponse![1])
	}

	/**
	 * Create a new authorizer instance for a given user
	 */
	public forUser(user: any) {
		return new ActionsAuthorizer(user, this.bouncer)
	}
}
