/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { AuthorizationResponse } from './response.js'

/**
 * Representation of a constructor
 */
export type Constructor<T> = new (...args: any[]) => T

/**
 * Representation of a lazy default import
 */
export type LazyImport<DefaultExport> = () => Promise<{ default: DefaultExport }>

/**
 * Helper to unwrap lazy import
 */
export type UnWrapLazyImport<Fn extends LazyImport<any>> = Awaited<ReturnType<Fn>>['default']

/**
 * Returns a list of actions from a policy class that could be
 * used with a specific bouncer instance for a given user
 */
export type GetPolicyMethods<User, Policy> = {
  [K in keyof Policy]: Policy[K] extends BouncerAuthorizer<User> ? K : never
}[keyof Policy]

/**
 * Narrowing the list of actions that can be used for
 * a specific bouncer instance for a given user
 */
export type NarrowActionsForAUser<
  User,
  Actions extends Record<string, BouncerAction<any>> | undefined,
> = {
  [K in keyof Actions]: Actions[K] extends BouncerAction<User> ? K : never
}[keyof Actions]

/**
 * A response that can be returned by an authorizer
 */
export type AuthorizerResponse =
  | boolean
  | Promise<boolean>
  | AuthorizationResponse
  | Promise<AuthorizationResponse>

/**
 * The callback function that authorizes an action. It should always
 * accept the user as the first argument, followed by additional
 * arguments.
 */
export type BouncerAuthorizer<User> = (user: User, ...args: any[]) => AuthorizerResponse

/**
 * Representation of a known bouncer action
 */
export type BouncerAction<User> = {
  allowGuest: boolean
  original: BouncerAuthorizer<User>
  execute(user: User | null, ...args: any[]): Promise<AuthorizationResponse>
}
