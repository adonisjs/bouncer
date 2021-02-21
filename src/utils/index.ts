/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { AuthorizationResult } from '@ioc:Adonis/Addons/Bouncer'

const ERROR_MESSAGE = 'Not authorized to perform this action'
const ERROR_STATUS = 403

/**
 * Normalizes the authorization hook response
 */
export function normalizeHookResponse(
  response: any
): { status: 'skipped' | 'authorized' | 'unauthorized' } {
  return {
    status:
      response === null || response === undefined
        ? ('skipped' as const)
        : response === true
        ? ('authorized' as const)
        : ('unauthorized' as const),
  }
}

/**
 * Normalizes the authorization action response
 */
export function normalizeActionResponse(response: any): AuthorizationResult {
  /**
   * Explicit true is considered a pass
   */
  if (response === true) {
    return {
      authorized: true,
      errorResponse: null,
    }
  }

  /**
   * Handle "Bouncer.deny" calls
   */
  if (Array.isArray(response) && response.length) {
    const [message, status] = response

    return {
      authorized: false,
      errorResponse: [message || 'Unauthorized Access', status || 403] as [string, number],
    }
  }

  /**
   * Everything else is marked as a failure
   */
  return {
    authorized: false,
    errorResponse: [ERROR_MESSAGE, ERROR_STATUS] as [string, number],
  }
}

/**
 * Profile a function call
 */
export async function profileFunction<Fn extends (...Args: any[]) => any>(
  actionName: string,
  data: any,
  fn: Fn,
  args: any[]
): Promise<ReturnType<Fn>> {
  if (!this.actionProfiler) {
    return fn(...args)
  }

  const action = this.actionProfiler.create(actionName, data)
  try {
    const response = await fn(...args)
    action.end()
    return response
  } catch (error) {
    action.end({ error })
    throw error
  }
}

/**
 * Inspect response to check if hook has hanlded the request
 * already or not
 */
export function hookHasHandledTheRequest(response: any) {
  return response !== null && response !== undefined
}
