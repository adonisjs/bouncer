/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { AuthorizationResponse } from './response.js'
import { AuthorizerResponse, BouncerAction, BouncerAuthorizer } from './types.js'

/**
 * Helper to convert a user defined authorizer function to a bouncer action
 */
export function action<Authorizer extends BouncerAuthorizer<any>>(
  authorizer: Authorizer,
  options?: { allowGuest: boolean }
) {
  return {
    allowGuest: options?.allowGuest || false,
    original: authorizer,
    async execute(user, ...args) {
      if (user === null && !this.allowGuest) {
        return new AuthorizationResponse(false)
      }

      const response = await this.original(user, ...args)
      return typeof response === 'boolean' ? new AuthorizationResponse(response) : response
    },
  } satisfies BouncerAction<any> as Authorizer extends (
    user: infer User,
    ...args: infer Args
  ) => AuthorizerResponse
    ? {
        allowGuest: false
        original: Authorizer
        execute(user: User | null, ...args: Args): Promise<AuthorizationResponse>
      }
    : never
}
