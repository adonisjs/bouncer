/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ProfilerRowContract, ProfilerContract } from '@ioc:Adonis/Core/Profiler'

export class AuthorizationProfiler {
	private profiler?: ProfilerRowContract

	constructor(
		label: string,
		profiler?: ProfilerRowContract | ProfilerContract,
		profilerPayload?: any
	) {
		if (profiler) {
			this.profiler = profiler.create(label, profilerPayload)
		}
	}

	/**
	 * Profiles a function
	 */
	public async profileFunction<Fn extends (...args: any[]) => any>(
		actionName: string,
		data: any,
		fn: Fn,
		args: any[]
	): Promise<ReturnType<Fn>> {
		if (!this.profiler) {
			return fn(...args)
		}

		const action = this.profiler.create(actionName, data)
		try {
			const response = await fn(...args)
			action.end()
			return response
		} catch (error) {
			action.end({ error })
			throw error
		}
	}

	public end<Payload extends any>(payload: Payload): Payload {
		if (this.profiler) {
			this.profiler.end(payload)
		}
		return payload
	}
}
