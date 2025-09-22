/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Represents the response from an authorization check, containing
 * information about whether access was granted or denied.
 *
 * @example
 * ```js
 * const response = AuthorizationResponse.deny('Access denied', 403)
 * response.t('errors.forbidden', { resource: 'post' })
 * ```
 */
export class AuthorizationResponse {
  /**
   * Create a deny response
   *
   * @param message Optional message explaining why access was denied
   * @param statusCode Optional HTTP status code for the response
   *
   * @example
   * ```js
   * AuthorizationResponse.deny('Insufficient permissions', 403)
   * ```
   */
  static deny(message?: string, statusCode?: number) {
    const response = new AuthorizationResponse(false)
    response.message = message
    response.status = statusCode
    return response
  }

  /**
   * Create an allowed response
   *
   * @example
   * ```js
   * AuthorizationResponse.allow()
   * ```
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

  /**
   * Whether the authorization was successful
   */
  constructor(public authorized: boolean) {}

  /**
   * Define the translation identifier for the authorization response
   *
   * @param identifier Translation key to use for internationalization
   * @param data Optional data to pass to the translation function
   *
   * @example
   * ```js
   * response.t('errors.access_denied', { resource: 'posts' })
   * ```
   */
  t(identifier: string, data?: Record<string, any>) {
    this.translation = { identifier, data }
    return this
  }
}
