/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Exception } from '@poppinss/utils'

export class ForbiddenException extends Exception {
	public static raise(message?: string, status?: number) {
		message = message || 'Unauthorized Access'
		status = status || 403
		return new this(message, status, 'E_AUTHORIZED_ACCESS')
	}
}
