/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class BouncerServiceProvider {
	constructor(protected app: ApplicationContract) {}
	public static needsApplication = true

	/**
	 * Register bouncer to the container
	 */
	public register() {
		this.app.container.singleton('Adonis/Addons/Bouncer', () => {
			const { Bouncer } = require('../src/Bouncer')
			return new Bouncer()
		})
	}

	/**
	 * Hook into the http context to provide an authorizer instance
	 */
	public boot() {
		this.app.container.with(
			['Adonis/Core/HttpContext', 'Adonis/Addons/Bouncer'],
			(HttpContext, Bouncer) => {
				HttpContext.getter(
					'bouncer',
					function () {
						return Bouncer.forUser(this.auth ? this.auth.user : null)
					},
					true
				)
			}
		)
	}
}
