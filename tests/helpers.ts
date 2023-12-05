/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Emitter } from '@adonisjs/core/events'
import { AppFactory } from '@adonisjs/core/factories/app'
import type { AuthorizationEvents } from '../src/types.js'

const BASE_URL = new URL('./tmp', import.meta.url)

export const createEmitter = () => {
  return new Emitter<AuthorizationEvents>(new AppFactory().create(BASE_URL, () => {}))
}
