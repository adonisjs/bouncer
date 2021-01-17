import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer'
import { User } from './user'

export default class UserPolicy extends BasePolicy {
	public async update(user: User, username: string) {}
}
