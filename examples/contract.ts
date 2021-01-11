import { actions } from './bouncer'
import { User } from './user'

declare module '@ioc:Adonis/Addons/Bouncer' {
	type ApplicationActions = ExtractActionsTypes<typeof actions>

	interface ActionsList extends ApplicationActions {
		mark_as_stale: Action<[user: User | null, isAdmin: boolean]>
	}
}
