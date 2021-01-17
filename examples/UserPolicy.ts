import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer'
import { User } from './user'

export default class UserPolicy extends BasePolicy {
	public async update(_user: User, _username: string) {}
}
