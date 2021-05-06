/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationContract } from '@ioc:Adonis/Core/Application'

/**
 * Lazily resolves the user from the auth module. Coz the bouncer
 * property may get access before the auth middleware is
 * executed.
 */
class AuthUserResolver {
  public getUser = () => this.auth.user
  constructor(private auth: any) {}
}

export default class BouncerServiceProvider {
  constructor(protected app: ApplicationContract) {}

  /**
   * Register bouncer to the container
   */
  public register() {
    this.app.container.singleton('Adonis/Addons/Bouncer', () => {
      const { Bouncer } = require('../src/Bouncer')
      return new Bouncer(this.app)
    })
  }

  /**
   * Hook into the http context to provide an authorizer instance
   */
  public boot() {
    this.app.container.withBindings(
      ['Adonis/Core/HttpContext', 'Adonis/Addons/Bouncer'],
      (HttpContext, Bouncer) => {
        HttpContext.getter(
          'bouncer',
          function bouncer() {
            return Bouncer.forUser(
              this.auth ? new AuthUserResolver(this.auth).getUser : null
            ) as any
          },
          true
        )
      }
    )

    this.app.container.withBindings(['Adonis/Core/Server', 'Adonis/Core/View'], (Server, View) => {
      const { CanTag, CannotTag } = require('../src/Bindings/View')
      View.registerTag(CanTag)
      View.registerTag(CannotTag)

      Server.hooks.before(async (ctx) => {
        ctx.view.share({ bouncer: ctx.bouncer })
      })
    })
  }
}
