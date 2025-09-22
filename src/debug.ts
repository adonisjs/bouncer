/*
 * @adonisjs/bouncerq
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { debuglog } from 'node:util'

/**
 * Debug logger instance for the AdonisJS bouncer package.
 * This provides a namespaced debug logger that can be controlled
 * via the DEBUG environment variable.
 *
 * @example
 * ```js
 * debug('executing ability "%s"', abilityName)
 * ```
 */
export default debuglog('adonisjs:bouncer')
