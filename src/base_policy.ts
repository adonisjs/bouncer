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
 * Base policy to define custom bouncer policies
 */
export abstract class BasePolicy {
  static booted: boolean = false
  static actionsMetaData: Record<string, { allowGuest: boolean }> = {}

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
   */
  static setActionMetaData(actionName: string, options: { allowGuest: boolean }) {
    this.boot()
    this.actionsMetaData[actionName] = options
  }
}
