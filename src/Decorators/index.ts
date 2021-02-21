/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ActionDecorator, BasePolicyConstructorContract } from '@ioc:Adonis/Addons/Bouncer'

export const action: ActionDecorator = (options) => {
  return function decorateAsColumn(target, property) {
    const Policy = target.constructor as BasePolicyConstructorContract
    Policy.boot()
    Policy.storeActionOptions<any>(property, options)
  }
}
