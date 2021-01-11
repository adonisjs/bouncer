import Bouncer from '@ioc:Adonis/Addons/Bouncer'
import { User } from './user'

Bouncer.forUser(new User()).allows('mark_as_stale', true)
