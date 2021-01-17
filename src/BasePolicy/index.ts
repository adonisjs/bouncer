/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { defineStaticProperty } from '@poppinss/utils'
import { ActionOptions, BasePolicyContract } from '@ioc:Adonis/Addons/Bouncer'

/**
 * Every policy must extend the base policy
 */
export class BasePolicy implements BasePolicyContract {
	public static booted: boolean
	public static actionsOptions: { [key: string]: ActionOptions }

	/**
	 * Boot the policy
	 */
	public static boot() {
		/**
		 * Define the property when not defined on self
		 */
		if (!this.hasOwnProperty('booted')) {
			this.booted = false
		}

		/**
		 * Return when already booted
		 */
		if (this.booted === true) {
			return
		}

		defineStaticProperty(this, BasePolicy, {
			propertyName: 'actionsOptions',
			defaultValue: {},
			strategy: 'inherit',
		})
	}

	/**
	 * Store action actions. This is usually invoked via a decarator
	 */
	public static storeActionOptions(propertyName: string, options: ActionOptions) {
		this.actionsOptions[propertyName] = options
		return this
	}
}
