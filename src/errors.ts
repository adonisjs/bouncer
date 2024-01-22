/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { I18n } from '@adonisjs/i18n'
import { Exception } from '@poppinss/utils'
import type { HttpContext } from '@adonisjs/core/http'
import type { AuthorizationResponse } from './response.js'

/**
 * AuthorizationException is raised by bouncer when an ability or
 * policy denies access to a user for a given resource.
 */
class AuthorizationException extends Exception {
  message = 'Access denied'
  status = 403
  code = 'E_AUTHORIZATION_FAILURE'

  /**
   * Error identifier to lookup translation message
   */
  identifier = 'errors.E_AUTHORIZATION_FAILURE'

  constructor(
    public response: AuthorizationResponse,
    options?: ErrorOptions & {
      code?: string
      status?: number
    }
  ) {
    super(response.message, options)
  }

  /**
   * Returns the message to be sent in the HTTP response.
   * Feel free to override this method and return a custom
   * response.
   */
  getResponseMessage(ctx: HttpContext) {
    /**
     * Give preference to response message and then fallback
     * to error message
     */
    const message = this.response.message || this.message

    /**
     * Use translation when using i18n package
     */
    if ('i18n' in ctx) {
      /**
       * Give preference to response translation and fallback to static
       * identifier.
       */
      const identifier = this.response.translation?.identifier || this.identifier
      const data = this.response.translation?.data || {}
      return (ctx.i18n as I18n).t(identifier, data, message)
    }

    return message
  }

  async handle(_: AuthorizationException, ctx: HttpContext) {
    const status = this.response.status || this.status
    const message = this.getResponseMessage(ctx)

    switch (ctx.request.accepts(['html', 'application/vnd.api+json', 'json'])) {
      case 'html':
      case null:
        ctx.response.status(status).send(message)
        break
      case 'json':
        ctx.response.status(status).send({
          errors: [
            {
              message,
            },
          ],
        })
        break
      case 'application/vnd.api+json':
        ctx.response.status(status).send({
          errors: [
            {
              code: this.code,
              title: message,
            },
          ],
        })
        break
    }
  }
}

export const E_AUTHORIZATION_FAILURE = AuthorizationException
