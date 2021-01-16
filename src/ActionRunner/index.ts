/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { AuthorizationResult } from '@ioc:Adonis/Addons/Bouncer'
import { ProfilerContract, ProfilerRowContract } from '@ioc:Adonis/Core/Profiler'
import { Bouncer } from '../Bouncer'

/**
 * Default error message and status
 */
const ERROR_MESSAGE = 'Not authorized to perform this action'
const ERROR_STATUS = 403

/**
 * An generic class to execute a given action alongside its hooks
 */
export class ActionRunner {
	private actionProfiler?: ProfilerRowContract

	constructor(
		public user: any,
		private bouncer: Bouncer,
		private profiler?: ProfilerContract | ProfilerRowContract
	) {}

	/**
	 * Scope the profiler actions by creating a nested profiler
	 * row
	 */
	private createChildProfiler(action: string) {
		if (this.profiler) {
			this.actionProfiler = this.profiler.create('bouncer:authorize', { action })
		}
	}

	/**
	 * Profile a function call
	 */
	private profileFunction(actionName: string, data: any, fn: (...args: any) => any, args: any[]) {
		if (!this.actionProfiler) {
			return fn(...args)
		}

		return this.actionProfiler.profileAsync(actionName, data, async () => fn(...args))
	}

	/**
	 * Mark action as completed
	 */
	private endAction(result: AuthorizationResult): AuthorizationResult {
		this.actionProfiler && this.actionProfiler.end(result)
		return result
	}

	/**
	 * Normalize the action response
	 */
	private normalizeResponse(response: any): AuthorizationResult {
		/**
		 * Explicit true is considered a pass
		 */
		if (response === true) {
			return {
				authorized: true,
				errorResponse: null,
			}
		}

		/**
		 * Handle "Bouncer.deny" calls
		 */
		if (Array.isArray(response) && response.length) {
			const [message, status] = response

			return {
				authorized: false,
				errorResponse: [message || 'Unauthorized Access', status || 403] as [string, number],
			}
		}

		/**
		 * Everything else is marked as a failure
		 */
		return {
			authorized: false,
			errorResponse: [ERROR_MESSAGE, ERROR_STATUS] as [string, number],
		}
	}

	/**
	 * Run all hooks for a given lifecycle phase
	 */
	private async runHooks(
		lifecycle: 'before' | 'after',
		action: string,
		result: null | AuthorizationResult,
		...args: any[]
	) {
		let response: any

		for (let hook of this.bouncer.hooks[lifecycle]) {
			const profilerData = { lifecycle, action, handler: hook.name || 'anonymous' }
			const hookParams =
				lifecycle === 'before'
					? [this.user, action, ...args]
					: [this.user, action, result!, ...args]

			/**
			 * Execute hook
			 */
			response = await this.profileFunction('bouncer:hook', profilerData, hook, hookParams)

			/**
			 * Short circuit when response is not undefined or null. Meaning the
			 * hook has decided to take over the request
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
		/**
		 * Raise exception when the action is not defined. We should not silently
		 * unauthorize requests when it is a programming error
		 */
		if (!this.bouncer.actions[action]) {
			throw new Error(
				`Cannot run "${action}" action. Make sure it is defined inside "start/bouncer" file`
			)
		}

		const { handler, options } = this.bouncer.actions[action]
		const allowGuest = options && options.allowGuest

		/**
		 * Disallow when user is missing and guest is not allowed
		 */
		if (!this.user && !allowGuest) {
			return this.normalizeResponse(false)
		}

		/**
		 * Execute action and profile it
		 */
		const response = await this.profileFunction(
			'bouncer:action',
			{ action, handler: handler.name || 'anonymous' },
			handler,
			[this.user, ...args]
		)

		return this.normalizeResponse(response)
	}

	/**
	 * Run the authorization action
	 */
	public async run(action: string, ...args: any[]) {
		this.createChildProfiler(action)

		try {
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
				return this.endAction(this.normalizeResponse(beforeStatus === 'authorized' ? true : false))
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
				return this.endAction(this.normalizeResponse(afterStatus === 'authorized' ? true : false))
			}

			return this.endAction(result)
		} catch (error) {
			this.actionProfiler &&
				this.actionProfiler.end({
					action: action,
					authorized: false,
					errorMessage: null,
					error,
				})
			throw error
		}
	}
}
