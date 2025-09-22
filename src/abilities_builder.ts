/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ability } from './ability.ts'
import { type AuthorizerResponse, type BouncerAbility, type BouncerAuthorizer } from './types.ts'

/**
 * Abilities builder exposes a chainable API to fluently create an object
 * of abilities by chaining the ".define" method. This provides a fluent
 * interface for building collections of authorization abilities.
 *
 * @example
 * ```js
 * const abilities = new AbilitiesBuilder({})
 *   .define('editPost', (user, post) => user.id === post.authorId)
 *   .define('viewPost', (user, post) => post.isPublished, { allowGuest: true })
 * ```
 */
export class AbilitiesBuilder<Abilities extends Record<string, BouncerAbility<any>>> {
  /**
   * Create a new AbilitiesBuilder instance
   *
   * @param abilities Initial abilities object to build upon
   */
  constructor(public abilities: Abilities) {}

  /**
   * Helper to convert a user defined authorizer function to a bouncer ability
   *
   * @param name Unique name for the ability
   * @param authorizer Authorization function
   * @param options Optional configuration for the ability
   *
   * @example
   * ```js
   * builder.define('editPost', (user, post) => user.id === post.authorId)
   * ```
   */
  define<Name extends string, Authorizer extends BouncerAuthorizer<any>>(
    name: Name,
    authorizer: Authorizer,
    options?: { allowGuest: boolean }
  ) {
    this.abilities[name] = ability(options || { allowGuest: false }, authorizer) as any

    return this as unknown as AbilitiesBuilder<
      Abilities & {
        [K in Name]: Authorizer extends (
          user: infer User,
          ...args: infer Args
        ) => AuthorizerResponse | Promise<AuthorizerResponse>
          ? {
              allowGuest: false
              original: Authorizer
              execute(user: User | null, ...args: Args): ReturnType<Authorizer>
            }
          : never
      }
    >
  }
}
