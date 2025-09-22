/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { defineStaticProperty } from '@poppinss/utils'

/**
 * Base policy to define custom bouncer policies. All policies should
 * extend this class to inherit the action metadata system.
 *
 * @example
 * ```js
 * class PostPolicy extends BasePolicy {
 *   @allowGuest()
 *   view(user, post) {
 *     return post.isPublished
 *   }
 *
 *   edit(user, post) {
 *     return user.id === post.authorId
 *   }
 * }
 * ```
 */
export abstract class BasePolicy {
  /**
   * Whether the policy class has been booted
   */
  static booted: boolean = false

  /**
   * Metadata for policy actions, including guest access permissions
   */
  static actionsMetaData: Record<string, { allowGuest: boolean }> = {}

  /**
   * Initialize the policy class and set up action metadata inheritance
   */
  static boot() {
    if (!this.hasOwnProperty('booted')) {
      this.booted = false
    }
    if (this.booted === false) {
      this.booted = true
      defineStaticProperty(this, 'actionsMetaData', { initialValue: {}, strategy: 'inherit' })
    }
  }

  /**
   * Set metadata for a action name
   *
   * @param actionName Name of the policy action method
   * @param options Configuration options for the action
   */
  static setActionMetaData(actionName: string, options: { allowGuest: boolean }) {
    this.boot()
    this.actionsMetaData[actionName] = options
  }
}
