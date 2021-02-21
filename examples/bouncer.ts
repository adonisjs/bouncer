import Bouncer from '@ioc:Adonis/Addons/Bouncer'
import { User, Manager } from './user'

export const { actions } = Bouncer.define('update_user', async (user: User | Manager) => {
  return !!user
}).define('view_user', async (user: User | null, isAdmin: boolean) => {
  return isAdmin || !!user?.id
})

export const { policies } = Bouncer.registerPolicies({
  UserPolicy: () => import('./UserPolicy'),
})
