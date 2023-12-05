/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

export class AuthorizationResponse {
  static deny(message?: string, statusCode?: number) {
    const response = new AuthorizationResponse(false)
    response.message = message
    response.status = statusCode
    return response
  }

  static allow() {
    return new AuthorizationResponse(true)
  }

  declare status?: number
  declare message?: string
  declare translation?: {
    identifier: string
    data?: Record<string, any>
  }

  constructor(public authorized: boolean) {}

  /**
   * Define the translation identifier for the authorization response
   */
  t(identifier: string, data?: Record<string, any>) {
    this.translation = { identifier, data }
    return this
  }
}
