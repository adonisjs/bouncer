/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { BasePolicy } from '../base_policy.ts'

/**
 * Define bouncer action metadata on a policy class method.
 * This decorator allows configuring how policy methods behave,
 * particularly regarding guest access.
 *
 * @param options Configuration options for the policy action
 *
 * @example
 * ```js
 * class PostPolicy extends BasePolicy {
 *   @action({ allowGuest: true })
 *   view(user, post) {
 *     return post.isPublished
 *   }
 * }
 * ```
 */
export function action(options: { allowGuest: boolean }) {
  /**
   * Decorator function that applies action metadata to policy methods
   *
   * @param target Policy instance
   * @param property Method name being decorated
   */
  return function (target: BasePolicy, property: string) {
    const Policy = target.constructor as typeof BasePolicy
    Policy.boot()
    Policy.setActionMetaData(property, options)
  }
}

/**
 * Allow guests on a policy action. This is a convenience decorator
 * that applies the action decorator with allowGuest set to true.
 *
 * @example
 * ```js
 * class PostPolicy extends BasePolicy {
 *   @allowGuest()
 *   view(user, post) {
 *     return post.isPublished
 *   }
 * }
 * ```
 */
export function allowGuest() {
  return action({ allowGuest: true })
}
