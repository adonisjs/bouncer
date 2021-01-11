/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Addons/Bouncer' {
	/*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

	/**
	 * Newable object
	 */
	export interface Newable {
		new (...args: any[]): any
	}

	/**
	 * Unwrap promise
	 */
	export type UnwrapPromise<T> = T extends PromiseLike<infer PT> ? PT : never

	/**
	 * Shape of default export
	 */
	export type DefaultExport<T> = Promise<{ default: T }>

	/**
	 * Filters the available actions to the one that depends upon the given user
	 */
	export type ExtractActionsForUser<User extends any, Actions extends any> = {
		[Action in keyof Actions]: Actions[Action] extends (user: User, ...args: any[]) => any
			? Action
			: never
	}[keyof Actions]

	/**
	 * Narrow down polices to the one that has a default export
	 */
	// export type FilterPolicies<Policies> = {
	// 	[K in keyof Policies]: Policies[K] extends { [key: string]: () => DefaultExport<Newable> }
	// 		? Policies[K]
	// 		: never
	// }

	/**
	 * Returns an array of arguments accepted by a given action, except the user
	 * argument
	 */
	export type GetActionRemainingArgs<
		Actions extends any,
		Action extends keyof Actions
	> = Actions[Action] extends (user: any, ...args: infer A) => any ? A : never

	/**
	 * Extracts types from the registered actions
	 */
	export type ExtractActionsTypes<Actions extends { [key: string]: { handler: ActionHandler } }> = {
		[K in keyof Actions]: Actions[K]['handler']
	}

	/**
	 * Use this type to define a custom type only action
	 */
	export type Action<Args extends any[]> = (...args: Args) => any

	/**
	 * Shape of the action handler
	 */
	export type ActionHandler = (...args: any[]) => Promise<ActionResponse> | ActionResponse

	/**
	 * Shape of the before hook handler
	 */
	export type BeforeHookHandler = (
		user: any,
		action: string,
		...args: any[]
	) => Promise<ActionResponse | void> | ActionResponse | void

	/**
	 * Shape of the after hook handler
	 */
	export type AfterHookHandler = (
		user: any,
		action: string,
		result: AuthorizationResult,
		...args: any[]
	) => Promise<ActionResponse | void> | ActionResponse | void

	/**
	 * The expected response from the action handler
	 */
	export type ActionResponse = boolean | [string, number?]

	/**
	 * Shape of the authorization result
	 */
	export type AuthorizationResult = {
		authorized: boolean
		errorResponse: null | [string, number]
	}

	/**
	 * Available options for a given actions
	 */
	export type ActionOptions = {
		allowGuest?: boolean
	}

	/**
	 * Bouncer allows defining actions and resources for authorization
	 */
	export interface BouncerContract<
		Actions extends {
			[key: string]: {
				handler: ActionHandler
				options?: ActionOptions
			}
		}
		// Policies extends any
	> {
		/**
		 * Registered actions
		 */
		actions: Actions

		/**
		 * Registered policies
		 */
		// policies: Policies

		/**
		 * Registered hooks
		 */
		hooks: {
			before: BeforeHookHandler[]
			after: AfterHookHandler[]
		}

		/**
		 * Register a before hook
		 */
		before(callback: BeforeHookHandler): this

		/**
		 * Register an after hook
		 */
		after(callback: AfterHookHandler): this

		/**
		 * Define an action and its handler
		 */
		define<Action extends string, Handler extends ActionHandler>(
			action: Action,
			handler: Handler,
			options?: ActionOptions
		): BouncerContract<
			Actions & Record<Action, { handler: Handler; options: ActionOptions }>
			// Policies
		>

		/**
		 * Register policies
		 */
		// registerPolicies<Policies extends { [key: string]: () => DefaultExport<Newable> }>(
		// 	policies: Policies
		// ): BouncerContract<Actions, Policies>

		/**
		 * Returns the authorizer instance for a given user
		 */
		forUser<User extends any>(user: User): ActionsAuthorizerContract<User>

		/**
		 * Deny authorization check using a custom message and status
		 */
		deny(message: string, status?: number): [string, number]
	}

	/**
	 * Authorizer allows authorizing actions for a given user
	 */
	export interface ActionsAuthorizerContract<User extends any> {
		user: User

		/**
		 * Returns the authorizer instance for a given user
		 */
		forUser<User extends any>(user: User): ActionsAuthorizerContract<User>

		/**
		 * Find if user is allowed to perform the action on a given resource
		 */
		allows<Action extends ExtractActionsForUser<User, ActionsList>>(
			action: Action,
			...args: GetActionRemainingArgs<ActionsList, Action>
		): Promise<boolean>

		/**
		 * Find if user is not allowed to perform the action on a given resource
		 */
		denies<Action extends ExtractActionsForUser<User, ActionsList>>(
			action: Action,
			...args: GetActionRemainingArgs<ActionsList, Action>
		): Promise<boolean>

		/**
		 * Authorize user for a given resource + action
		 */
		authorize<Action extends ExtractActionsForUser<User, ActionsList>>(
			action: Action,
			...args: GetActionRemainingArgs<ActionsList, Action>
		): Promise<void>

		/**
		 * Get authorizer instance for a given policy
		 */
		// with<Policy extends keyof FilterPolicies<PoliciesList>>(
		// 	policy: Policy
		// ): PolicyAuthorizerContract<
		// 	User,
		// 	InstanceType<UnwrapPromise<ReturnType<PoliciesList[Policy]>>['default']>
		// >
	}

	/**
	 * Policy authorizer allows authorizing policy actions for a given user
	 */
	// export interface PolicyAuthorizerContract<User extends any, Actions extends any> {
	// 	user: User

	// 	/**
	// 	 * Returns the authorizer instance for a given user
	// 	 */
	// 	forUser<User extends any>(user: User): PolicyAuthorizerContract<User, Actions>

	// 	/**
	// 	 * Find if user is allowed to perform the action on a given resource
	// 	 */
	// 	allows<Action extends ExtractActionsForUser<User, Actions>>(
	// 		action: Action,
	// 		...args: GetActionRemainingArgs<Actions, Action>
	// 	): Promise<boolean>

	// 	/**
	// 	 * Find if user is not allowed to perform the action on a given resource
	// 	 */
	// 	denies<Action extends ExtractActionsForUser<User, Actions>>(
	// 		action: Action,
	// 		...args: GetActionRemainingArgs<Actions, Action>
	// 	): Promise<boolean>

	// 	/**
	// 	 * Authorize user for a given resource + action
	// 	 */
	// 	authorize<Action extends ExtractActionsForUser<User, Actions>>(
	// 		action: Action,
	// 		...args: GetActionRemainingArgs<Actions, Action>
	// 	): Promise<void>
	// }

	/**
	 * The following interfaces are re-defined inside the user land to
	 * have application wide
	 */
	export interface ActionsList {}
	// export interface PoliciesList {}

	const Bouncer: BouncerContract<{}>
	export default Bouncer
}
