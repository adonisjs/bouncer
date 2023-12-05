/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ability } from './ability.js'
import { AuthorizerResponse, BouncerAbility, BouncerAuthorizer } from './types.js'

/**
 * Abilities builder exposes a chainable API to fluently create an object
 * of abilities by chaining the ".define" method.
 */
export class AbilitiesBuilder<Abilities extends Record<string, BouncerAbility<any>>> {
  constructor(public abilities: Abilities) {}

  /**
   * Helper to convert a user defined authorizer function to a bouncer ability
   */
  define<Name extends string, Authorizer extends BouncerAuthorizer<any>>(
    name: Name,
    authorizer: Authorizer,
    options?: { allowGuest: boolean }
  ) {
    this.abilities[name] = ability(authorizer, options) as any

    return this as unknown as AbilitiesBuilder<
      Abilities & {
        [K in Name]: Authorizer extends (
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
    >
  }
}
