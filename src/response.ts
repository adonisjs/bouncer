/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

export class AuthorizationResponse {
  /**
   * Create a deny response
   */
  static deny(message?: string, statusCode?: number) {
    const response = new AuthorizationResponse(false)
    response.message = message
    response.status = statusCode
    return response
  }

  /**
   * Create an allowed response
   */
  static allow() {
    return new AuthorizationResponse(true)
  }

  /**
   * HTTP status for the authorization response
   */
  declare status?: number

  /**
   * Response message
   */
  declare message?: string

  /**
   * Translation identifier to use for creating the
   * authorization response
   */
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
