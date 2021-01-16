/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { ActionsAuthorizerContract } from '@ioc:Adonis/Addons/Bouncer'
import { ProfilerContract, ProfilerRowContract } from '@ioc:Adonis/Core/Profiler'

import { Bouncer } from '../Bouncer'
import { ActionRunner } from '../ActionRunner'
import { AuthorizationException } from '../Exceptions/AuthorizationException'

/**
 * Exposes the API to authorize actions
 */
export class ActionsAuthorizer implements ActionsAuthorizerContract<any> {
	private profiler?: ProfilerRowContract | ProfilerContract

	constructor(public user: any, private bouncer: Bouncer) {}

	/**
	 * Set profiler instance to be used for profiling calls
	 */
	public setProfiler(profiler: ProfilerRowContract | ProfilerContract) {
		this.profiler = profiler
		return this
	}

	/**
	 * Find if a user is allowed to perform the action
	 */
	public async allows(action: string, ...args: any[]) {
		const { authorized } = await new ActionRunner(this.user, this.bouncer, this.profiler).run(
			action,
			...args
		)
		return authorized === true
	}

	/**
	 * Find if a user is not allowed to perform the action
	 */
	public async denies(action: string, ...args: any[]) {
		const { authorized } = await new ActionRunner(this.user, this.bouncer, this.profiler).run(
			action,
			...args
		)
		return authorized === false
	}

	/**
	 * Authorize user against the given action
	 */
	public async authorize(action: string, ...args: any[]) {
		const { authorized, errorResponse } = await new ActionRunner(
			this.user,
			this.bouncer,
			this.profiler
		).run(action, ...args)

		if (authorized) {
			return
		}

		throw AuthorizationException.raise(errorResponse![0], errorResponse![1])
	}

	/**
	 * Create a new authorizer instance for a given user
	 */
	public forUser(user: any) {
		return new ActionsAuthorizer(user, this.bouncer)
	}
}
