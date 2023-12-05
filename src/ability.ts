/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { AuthorizationResponse } from './response.js'
import { AuthorizerResponse, BouncerAbility, BouncerAuthorizer } from './types.js'

/**
 * Helper to convert a user defined authorizer function to a bouncer ability
 */
export function ability<Authorizer extends BouncerAuthorizer<any>>(
  authorizer: Authorizer,
  options?: { allowGuest: boolean }
) {
  return {
    allowGuest: options?.allowGuest || false,
    original: authorizer,
    execute(user, ...args) {
      if (user === null && !this.allowGuest) {
        return AuthorizationResponse.deny()
      }
      return this.original(user, ...args)
    },
  } satisfies BouncerAbility<any> as Authorizer extends (
    user: infer User,
    ...args: infer Args
  ) => AuthorizerResponse
    ? {
        allowGuest: false
        original: Authorizer
        execute(user: User | null, ...args: Args): AuthorizerResponse
      }
    : never
}
