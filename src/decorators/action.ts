/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { BasePolicy } from '../base_policy.js'

/**
 * Define bouncer action metadata on a policy class method
 */
export function action(options: { allowGuest: boolean }) {
  return function (target: BasePolicy, property: string) {
    const Policy = target.constructor as typeof BasePolicy
    Policy.boot()
    Policy.setActionMetaData(property, options)
  }
}

/**
 * Allow guests on a policy action
 */
export function allowGuest() {
  return action({ allowGuest: true })
}
