import { BasePolicy, action } from '@ioc:Adonis/Addons/Bouncer'
import { User } from './user'

export default class UserPolicy extends BasePolicy {
  @action({ allowGuest: true })
  public async update(_user: User, _username: string) {
    return true
  }
}
