/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { AuthorizationResponse } from './response.ts'
import { type AuthorizerResponse, type BouncerAbility, type BouncerAuthorizer } from './types.ts'

type AuthorizerToAbility<Authorizer> = Authorizer extends (
  user: infer User,
  ...args: infer Args
) => AuthorizerResponse | Promise<AuthorizerResponse>
  ? {
      allowGuest: false
      original: Authorizer
      execute(user: User | null, ...args: Args): AuthorizerResponse | Promise<AuthorizerResponse>
    }
  : never

/**
 * Helper to convert a user defined authorizer function to a bouncer ability.
 * The ability function wraps authorization logic and handles guest access control.
 *
 * @param options Configuration options for the ability
 * @param authorizer Authorization function to wrap
 *
 * @example
 * ```js
 * const editPost = ability((user, post) => {
 *   return user.id === post.authorId
 * })
 *
 * const viewPost = ability({ allowGuest: true }, (user, post) => {
 *   return post.isPublished || (user && user.id === post.authorId)
 * })
 * ```
 */
export function ability<Authorizer extends BouncerAuthorizer<any>>(
  options: { allowGuest: boolean },
  authorizer: Authorizer
): AuthorizerToAbility<Authorizer>
export function ability<Authorizer extends BouncerAuthorizer<any>>(
  authorizer: Authorizer
): AuthorizerToAbility<Authorizer>
export function ability<Authorizer extends BouncerAuthorizer<any>>(
  authorizerOrOptions: Authorizer | { allowGuest: boolean },
  authorizer?: Authorizer
) {
  if (typeof authorizerOrOptions === 'function') {
    return {
      allowGuest: false,
      original: authorizerOrOptions,
      execute(user, ...args) {
        if (user === null && !this.allowGuest) {
          return AuthorizationResponse.deny()
        }
        return this.original(user, ...args)
      },
    } satisfies BouncerAbility<any>
  } else {
    return {
      allowGuest: authorizerOrOptions?.allowGuest || false,
      original: authorizer!,
      execute(user, ...args) {
        if (user === null && !this.allowGuest) {
          return AuthorizationResponse.deny()
        }
        return this.original(user, ...args)
      },
    } satisfies BouncerAbility<any>
  }
}
