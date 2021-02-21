/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Addons/Bouncer' {
	import { ProfilerRowContract, ProfilerContract } from '@ioc:Adonis/Core/Profiler'

	/*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

	/**
	 * Unwrap promise
	 */
	export type UnwrapPromise<T> = T extends PromiseLike<infer PT> ? PT : never

	/**
	 * Shape of default export
	 */
	export type DefaultExport<T> = Promise<{ default: T }>

	/**
	 * Shape of the function that imports a policy class
	 */
	export type LazyPolicy = () => DefaultExport<BasePolicyConstructorContract>

	/**
	 * Filters the available actions to the one that depends upon the given user
	 */
	export type ExtractActionsForUser<User extends any, Actions extends any> = {
		[Action in keyof Actions]: Actions[Action] extends (user: User, ...args: any[]) => any
			? Action
			: never
	}[keyof Actions]

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
	 * Extracts types from the registered policies
	 */
	export type ExtractPoliciesTypes<Policies extends { [key: string]: LazyPolicy }> = {
		[K in keyof Policies]: InstanceType<UnwrapPromise<ReturnType<Policies[K]>>['default']>
	}

	/**
	 * Use this type to define a custom type only action
	 */
	export type Action<Args extends any[]> = (
		...args: Args
	) => Promise<ActionResponse> | ActionResponse

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
	 * Shape of the base policy. All policies must extend it
	 */
	export interface BasePolicyContract {}

	/**
	 * Shape of the policy constructor
	 */
	export interface BasePolicyConstructorContract extends BasePolicyContract {
		new (...args: any[]): BasePolicyContract

		/**
		 * Meta data for the actions
		 */
		actionsOptions: { [key: string]: ActionOptions }

		/**
		 * A boolean to know if the class has been booted
		 */
		booted: boolean

		/**
		 * Boot the policy
		 */
		boot(): void

		/**
		 * Store options for a given policy action
		 */
		storeActionOptions<T extends BasePolicyConstructorContract>(
			this: T,
			propertyName: keyof InstanceType<T>,
			options?: ActionOptions
		): this
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
		},
		Policies extends { [key: string]: LazyPolicy }
	> {
		/**
		 * Registered actions
		 */
		actions: Actions

		/**
		 * Registered policies
		 */
		policies: Policies

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
		define<ActionName extends string, Handler extends ActionHandler>(
			action: ActionName,
			handler: Handler,
			options?: ActionOptions
		): BouncerContract<
			Actions & Record<ActionName, { handler: Handler; options: ActionOptions }>,
			Policies
		>

		/**
		 * Register policies
		 */
		registerPolicies<BouncerPolicies extends { [key: string]: LazyPolicy }>(
			policies: BouncerPolicies
		): BouncerContract<Actions, BouncerPolicies>

		/**
		 * Returns the authorizer instance for a given user
		 */
		forUser<User extends any>(user: User): ActionsAuthorizerContract<User>

		/**
		 * Deny authorization check using a custom message and an optional status
		 */
		deny(message: string, status?: number): [string, number]
	}

	/**
	 * Authorizer allows authorizing actions for a given user
	 */
	export interface ActionsAuthorizerContract<ActionsUser extends any> {
		user: ActionsUser

		/**
		 * Set the profiler to be used for profiling the function calls
		 */
		setProfiler(profiler?: ProfilerRowContract | ProfilerContract): this

		/**
		 * Returns the authorizer instance for a given user
		 */
		forUser<User extends any>(user: User): ActionsAuthorizerContract<User>

		/**
		 * Find if user is allowed to perform the action on a given resource
		 */
		allows<ActionName extends ExtractActionsForUser<ActionsUser, ActionsList>>(
			action: ActionName,
			...args: GetActionRemainingArgs<ActionsList, ActionName>
		): Promise<boolean>

		/**
		 * Find if user is not allowed to perform the action on a given resource
		 */
		denies<ActionName extends ExtractActionsForUser<ActionsUser, ActionsList>>(
			action: ActionName,
			...args: GetActionRemainingArgs<ActionsList, ActionName>
		): Promise<boolean>

		/**
		 * Authorize user for a given resource + action
		 */
		authorize<ActionName extends ExtractActionsForUser<ActionsUser, ActionsList>>(
			action: ActionName,
			...args: GetActionRemainingArgs<ActionsList, ActionName>
		): Promise<void>

		/**
		 * Use a policy for authorization
		 */
		with<Policy extends keyof PoliciesList>(
			policy: Policy
		): PoliciesAuthorizerContract<ActionsUser, Policy>

		/**
		 * The untyped version of [[this.allows]] and support references a policy.action
		 * via string. Added mainly to be used inside the templates.
		 *
		 * For example:
		 * ```
		 * bouncer.can('PostPolicy.update', post)
		 * ```
		 */
		can(action: string, ...args: any[]): Promise<boolean>

		/**
		 * The untyped version of [[this.denies]] and support references a policy.action
		 * via string. Added mainly to be used inside the templates.
		 *
		 * For example:
		 * ```
		 * bouncer.cannot('PostPolicy.update', post)
		 * ```
		 */
		cannot(action: string, ...args: any[]): Promise<boolean>
	}

	/**
	 * Authorizer allows authorizing actions for a given user
	 */
	export interface PoliciesAuthorizerContract<
		PolicyUser extends any,
		Policy extends keyof PoliciesList
	> {
		user: PolicyUser

		/**
		 * Set the profiler to be used for profiling function calls
		 */
		setProfiler(profiler?: ProfilerRowContract | ProfilerContract): this

		/**
		 * Returns the authorizer instance for a given user
		 */
		forUser<User extends any>(user: User): PoliciesAuthorizerContract<User, Policy>

		/**
		 * Find if user is allowed to perform the action on a given resource
		 */
		allows<PolicyAction extends ExtractActionsForUser<PolicyUser, PoliciesList[Policy]>>(
			action: PolicyAction,
			...args: GetActionRemainingArgs<PoliciesList[Policy], PolicyAction>
		): Promise<boolean>

		/**
		 * Find if user is not allowed to perform the action on a given resource
		 */
		denies<PolicyAction extends ExtractActionsForUser<PolicyUser, PoliciesList[Policy]>>(
			action: PolicyAction,
			...args: GetActionRemainingArgs<PoliciesList[Policy], PolicyAction>
		): Promise<boolean>

		/**
		 * Authorize user for a given resource + action
		 */
		authorize<PolicyAction extends ExtractActionsForUser<PolicyUser, PoliciesList[Policy]>>(
			action: PolicyAction,
			...args: GetActionRemainingArgs<PoliciesList[Policy], PolicyAction>
		): Promise<void>
	}

	/**
	 * The following interfaces are re-defined inside the user land to
	 * have application wide
	 */
	export interface ActionsList {}
	export interface PoliciesList {}

	/**
	 * Typed decorator
	 */
	export type TypedDecorator<PropType> = <
		TKey extends string,
		TTarget extends { [K in TKey]: PropType }
	>(
		target: TTarget,
		property: TKey
	) => void

	/**
	 * Shape of the action decorator
	 */
	export type ActionDecorator = (options: Partial<ActionOptions>) => TypedDecorator<Action<any>>

	const Bouncer: BouncerContract<{}, {}>
	export const BasePolicy: BasePolicyConstructorContract
	export const action: ActionDecorator
	export default Bouncer
}
