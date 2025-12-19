/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { AuthorizationResponse } from './response.ts'

/**
 * Returns a list of methods from a policy class that could be
 * used with a specific bouncer instance for a given user. This utility
 * type filters policy methods to only include those that match the
 * BouncerAuthorizer signature.
 *
 * @template User The user type for the bouncer instance
 * @template Policy The policy class type
 *
 * @example
 * ```typescript
 * class PostPolicy {
 *   view(user: User, post: Post) { return true }
 *   edit(user: User, post: Post) { return user.id === post.authorId }
 *   nonAuthMethod() { return 'not an auth method' }
 * }
 *
 * // Only 'view' and 'edit' will be included
 * type Methods = GetPolicyMethods<User, PostPolicy>
 * ```
 */
export type GetPolicyMethods<User, Policy> = {
  [K in keyof Policy]: Policy[K] extends BouncerAuthorizer<User> ? K : never
}[keyof Policy]

/**
 * Narrowing the list of abilities that can be used for
 * a specific bouncer instance for a given user. This utility type
 * filters abilities to only include those that are compatible with
 * the specified user type.
 *
 * @template User The user type for the bouncer instance
 * @template Abilities The abilities record type
 *
 * @example
 * ```typescript
 * const abilities = {
 *   editPost: ability((user: User, post: Post) => user.id === post.authorId),
 *   viewPublicPost: ability((user: Guest, post: Post) => post.isPublic)
 * }
 *
 * // Only abilities compatible with User type will be included
 * type UserAbilities = NarrowAbilitiesForAUser<User, typeof abilities>
 * ```
 */
export type NarrowAbilitiesForAUser<
  User,
  Abilities extends Record<string, BouncerAbility<any>> | undefined,
> = {
  [K in keyof Abilities]: Abilities[K] extends BouncerAbility<User> ? K : never
}[keyof Abilities]

/**
 * A response that can be returned by an authorizer function. This union type
 * allows authorizers to return either a simple boolean for basic allow/deny
 * decisions or a full AuthorizationResponse object for more detailed responses
 * with custom messages, status codes, and translation support.
 *
 * @example
 * ```typescript
 * // Simple boolean response
 * const simpleAuth = (user: User, post: Post): AuthorizerResponse => {
 *   return user.id === post.authorId
 * }
 *
 * // Detailed response with message
 * const detailedAuth = (user: User, post: Post): AuthorizerResponse => {
 *   if (user.id === post.authorId) {
 *     return AuthorizationResponse.allow()
 *   }
 *   return AuthorizationResponse.deny('You can only edit your own posts', 403)
 * }
 * ```
 */
export type AuthorizerResponse = boolean | AuthorizationResponse

/**
 * The callback function that authorizes an ability. It should always
 * accept the user as the first argument, followed by additional
 * arguments that provide context for the authorization decision.
 *
 * @template User The user type being authorized
 * @param user The user object making the request
 * @param args Additional arguments needed for authorization (e.g., resources, context)
 *
 * @example
 * ```typescript
 * // Synchronous authorizer
 * const editPost: BouncerAuthorizer<User> = (user, post: Post) => {
 *   return user.id === post.authorId
 * }
 *
 * // Asynchronous authorizer
 * const deletePost: BouncerAuthorizer<User> = async (user, post: Post) => {
 *   const isAuthor = user.id === post.authorId
 *   const isAdmin = await user.hasRole('admin')
 *   return isAuthor || isAdmin
 * }
 *
 * // With multiple arguments
 * const viewPost: BouncerAuthorizer<User> = (user, post: Post, context: Context) => {
 *   return post.isPublic || user.id === post.authorId || context.isPreview
 * }
 * ```
 */
export type BouncerAuthorizer<User> = (
  user: User,
  ...args: any[]
) => AuthorizerResponse | Promise<AuthorizerResponse>

/**
 * Representation of a known bouncer ability. This object wraps an authorizer
 * function with additional metadata and execution logic, including support
 * for guest users and consistent execution patterns.
 *
 * @template User The user type for this ability
 *
 * @example
 * ```typescript
 * const editPostAbility: BouncerAbility<User> = {
 *   allowGuest: false,
 *   original: (user, post) => user.id === post.authorId,
 *   execute: async (user, post) => {
 *     if (user === null && !this.allowGuest) {
 *       return AuthorizationResponse.deny()
 *     }
 *     return this.original(user, post)
 *   }
 * }
 *
 * // Created using the ability helper
 * const viewPostAbility = ability((user, post) => {
 *   return post.isPublic || (user && user.id === post.authorId)
 * })
 * ```
 */
export type BouncerAbility<User> = {
  /**
   * Whether this ability allows guest (null) users
   */
  allowGuest: boolean

  /**
   * The original authorizer function provided by the developer
   */
  original: BouncerAuthorizer<User>

  /**
   * Execute the ability with proper guest handling and response normalization
   *
   * @param user The user object or null for guests
   * @param args Additional arguments for the authorization check
   */
  execute(user: User | null, ...args: any[]): AuthorizerResponse | Promise<AuthorizerResponse>
}

/**
 * Response builder is used to normalize response to
 * an instanceof AuthorizationResponse. This function ensures that
 * all authorization responses are consistently typed and formatted,
 * converting simple boolean responses to AuthorizationResponse objects.
 *
 * @param response The raw response from an authorizer (boolean or AuthorizationResponse)
 *
 * @example
 * ```typescript
 * const builder: ResponseBuilder = (response) => {
 *   if (typeof response === 'boolean') {
 *     return new AuthorizationResponse(response)
 *   }
 *   return response
 * }
 *
 * // Usage
 * const normalized1 = builder(true)  // AuthorizationResponse { authorized: true }
 * const normalized2 = builder(AuthorizationResponse.deny('Access denied'))  // Unchanged
 * ```
 */
export type ResponseBuilder = (response: boolean | AuthorizationResponse) => AuthorizationResponse

/**
 * Events emitted by bouncer during authorization operations. These events
 * allow developers to listen for authorization attempts and implement
 * custom logging, auditing, or other side effects.
 *
 * @example
 * ```typescript
 * // Listen for authorization events
 * emitter.on('authorization:finished', (event) => {
 *   console.log(`User ${event.user?.id} attempted ${event.action}`)
 *   console.log(`Result: ${event.response.authorized ? 'ALLOWED' : 'DENIED'}`)
 *
 *   if (!event.response.authorized) {
 *     // Log failed authorization attempts
 *     auditLogger.logFailedAuthorization({
 *       user: event.user,
 *       action: event.action,
 *       parameters: event.parameters,
 *       reason: event.response.message
 *     })
 *   }
 * })
 * ```
 */
export type BouncerEvents = {
  /**
   * Emitted when an authorization check is completed
   */
  'authorization:finished': {
    /**
     * The user who attempted the action (may be null for guests)
     */
    user: any

    /**
     * The name of the action or ability that was checked
     */
    action: string

    /**
     * Arguments passed to the authorization function
     */
    parameters: any[]

    /**
     * The final authorization response
     */
    response: AuthorizationResponse
  }
}
