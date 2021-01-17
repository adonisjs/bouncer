import { actions, policies } from './bouncer'
import { User } from './user'

declare module '@ioc:Adonis/Addons/Bouncer' {
	type ApplicationActions = ExtractActionsTypes<typeof actions>
	type ApplicationPolicies = ExtractPoliciesTypes<typeof policies>

	interface ActionsList extends ApplicationActions {
		mark_as_stale: Action<[user: User | null, isAdmin: boolean]>
	}

	interface PoliciesList extends ApplicationPolicies {}
}
