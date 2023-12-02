/*
 * @adonisjs/boucner
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Container, inject } from '@adonisjs/core/container'

import { Bouncer } from '../src/bouncer.js'
import { BasePolicy } from '../src/base_policy.js'
import { AuthorizationResponse } from '../src/response.js'

test.group('Bouncer | actions | types', () => {
  test('assert allowed actions by reference', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    const editPost = Bouncer.action((_: User) => false)
    const editStaff = Bouncer.action((_: Admin) => false)
    const bouncer = new Bouncer(new User())
    await bouncer.execute(editPost)

    /**
     * Since, the editStaff action needs an instance of Admin
     * class, it cannot used with a bouncer instance created
     * for the User class
     */
    // @ts-expect-error
    await bouncer.execute(editStaff)

    /**
     * Since, we have not passed any predefined actions to buncer, we
     * cannot call them as string
     */
    // @ts-expect-error
    await bouncer.execute('editStaff')
  }).throws(`Invalid bouncer action 'editStaff'`)

  test('assert allowed pre-defined actions', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    const editPost = Bouncer.action((_: User) => false)
    const editStaff = Bouncer.action((_: Admin) => false)
    const bouncer = new Bouncer(new User(), { editPost, editStaff })

    await bouncer.execute('editPost')

    /**
     * Since, the editStaff action needs an instance of Admin
     * class, it cannot used with a bouncer instance created
     * for the User class
     */
    // @ts-expect-error
    await bouncer.execute('editStaff')
    // @ts-expect-error
    await bouncer.execute(editStaff)
  })

  test('assert allowed actions from policies', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    class PostPolicy extends BasePolicy {
      viewAll(_: User) {
        return true
      }
    }
    class StaffPolicy {
      viewAll(_: Admin) {
        return true
      }
    }

    const editPost = Bouncer.action((_: User) => false)
    const editStaff = Bouncer.action((_: Admin) => false)

    const bouncer = new Bouncer(new User())
    await bouncer.execute(editPost)
    await bouncer.execute([PostPolicy, 'viewAll'])

    /**
     * Since, the editStaff action needs an instance of Admin
     * class, it cannot used with a bouncer instance created
     * for the User class
     */
    // @ts-expect-error
    await bouncer.execute(editStaff)

    /**
     * Since, we have not passed any predefined actions to buncer, we
     * cannot call them as string
     */
    // @ts-expect-error
    await bouncer.execute('editStaff')

    /**
     * Since, the "StaffPolicy" needs Admin class, it cannot be
     * used with the bouncer instance created for the User
     * class.
     */
    // @ts-expect-error
    await bouncer.execute([StaffPolicy, 'viewAll'])
  }).throws(`Invalid bouncer action 'editStaff'`)

  test('infer arguments accepted by an action', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Post {
      declare userId: null
      declare title: string
    }

    const editPost = Bouncer.action((_: User, __: Post) => {
      return false
    })
    const bouncer = new Bouncer(new User(), { editPost })

    bouncer.allows('editPost', new Post())
    bouncer.allows(editPost, new Post())

    /**
     * Since, the editPost action needs post instance, it gives
     * type error if do not pass the parameter
     */
    // @ts-expect-error
    bouncer.allows('editPost')

    /**
     * Since, the editPost action needs post instance, it gives
     * type error if do not pass the parameter
     */
    // @ts-expect-error
    bouncer.allows(editPost)
  })

  test('infer arguments accepted by a policy', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Post {
      declare userId: null
      declare title: string
    }

    class PostPolicy extends BasePolicy {
      viewAll(_: User, __: Post) {
        return true
      }
    }

    const bouncer = new Bouncer(new User())
    await bouncer.execute([PostPolicy, 'viewAll'], new Post())

    /**
     * Since, the "viewAll" action needs a post instance, it returns
     * an error when post instance is not provided
     */
    // @ts-expect-error
    await bouncer.execute([PostPolicy, 'viewAll'])
  })

  test('assert allowed actions by reference with union of users', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    const editPost = Bouncer.action((_: User | Admin) => false)
    const editStaff = Bouncer.action((_: User | Admin) => false)

    const bouncer = new Bouncer<User | Admin>(new User())
    const bouncer1 = new Bouncer(new User())

    await bouncer.allows(editPost)
    await bouncer.allows(editStaff)

    await bouncer1.allows(editPost)
    await bouncer1.allows(editStaff)

    /**
     * Since, we have not passed any predefined actions to buncer, we
     * cannot call them as string
     */
    // @ts-expect-error
    await bouncer.allows('editStaff')
    /**
     * Since, we have not passed any predefined actions to buncer, we
     * cannot call them as string
     */
    // @ts-expect-error
    await bouncer1.allows('editStaff')
  }).throws(`Invalid bouncer action 'editStaff'`)

  test('assert allowed pre-defined actions with union of users', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    const editPost = Bouncer.action((_: User | Admin) => false)
    const editStaff = Bouncer.action((_: User | Admin) => false)
    const actions = { editPost, editStaff }

    const bouncer = new Bouncer<User | Admin, typeof actions>(new User(), actions)
    const bouncer1 = new Bouncer(new User(), actions)

    await bouncer.allows('editPost')
    await bouncer.allows('editStaff')
    await bouncer.allows(editStaff)

    await bouncer1.allows('editPost')
    await bouncer1.allows('editStaff')
    await bouncer1.allows(editStaff)
  })

  test('assert allowed actions from policies with union of users', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    class PostPolicy extends BasePolicy {
      viewAll(_: User | Admin) {
        return true
      }
    }
    class StaffPolicy extends BasePolicy {
      viewAll(_: Admin | User) {
        return true
      }
    }

    const bouncer = new Bouncer(new User())
    await bouncer.execute([PostPolicy, 'viewAll'])
    await bouncer.execute([StaffPolicy, 'viewAll'])

    const bouncer1 = new Bouncer<User | Admin>(new User())
    await bouncer1.execute([PostPolicy, 'viewAll'])
    await bouncer1.execute([StaffPolicy, 'viewAll'])
  })
})

test.group('Bouncer | actions', () => {
  test('execute action by reference', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.action((_: User) => false)
    const bouncer = new Bouncer(new User())

    const response = await bouncer.execute(editPost)
    assert.instanceOf(response, AuthorizationResponse)
    assert.equal(response.authorized, false)
  })

  test('execute action from pre-defined list', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.action((_: User) => false)
    const bouncer = new Bouncer(new User(), { editPost })

    const response = await bouncer.execute('editPost')
    assert.instanceOf(response, AuthorizationResponse)
    assert.equal(response.authorized, false)
  })

  test('execute policy action', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      viewAll(_: User) {
        return false
      }
    }

    const bouncer = new Bouncer(new User())
    const response = await bouncer.execute([PostPolicy, 'viewAll'])
    assert.instanceOf(response, AuthorizationResponse)
    assert.equal(response.authorized, false)
  })

  test('pass arguments to the action', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }
    class Post {
      constructor(public userId: number) {}
    }

    const editPost = Bouncer.action((user: User, post: Post) => {
      return post.userId === user.id
    })

    const bouncer = new Bouncer(new User(1), { editPost })

    const response = await bouncer.execute('editPost', new Post(1))
    assert.instanceOf(response, AuthorizationResponse)
    assert.equal(response.authorized, true)

    const referenceResponse = await bouncer.execute(editPost, new Post(2))
    assert.instanceOf(referenceResponse, AuthorizationResponse)
    assert.equal(referenceResponse.authorized, false)
  })

  test('pass arguments to policy action', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }
    class Post {
      constructor(public userId: number) {}
    }

    class PostPolicy extends BasePolicy {
      viewAll(user: User, post: Post) {
        return post.userId === user.id
      }
    }

    const bouncer = new Bouncer(new User(1))
    const response = await bouncer.execute([PostPolicy, 'viewAll'], new Post(1))
    assert.instanceOf(response, AuthorizationResponse)
    assert.equal(response.authorized, true)

    const failingResponse = await bouncer.execute([PostPolicy, 'viewAll'], new Post(2))
    assert.instanceOf(failingResponse, AuthorizationResponse)
    assert.equal(failingResponse.authorized, false)
  })

  test('check if user is allowed or denied to perform an action', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.action((_: User) => false)
    const bouncer = new Bouncer(new User(), { editPost })

    assert.isFalse(await bouncer.allows(editPost))
    assert.isTrue(await bouncer.denies(editPost))

    assert.isFalse(await bouncer.allows('editPost'))
    assert.isTrue(await bouncer.denies('editPost'))
  })

  test('check if user is allowed or denied to perform a policy action', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }

    class PostPolicy extends BasePolicy {
      viewAll(_: User) {
        return false
      }
    }

    const editPost = Bouncer.action((_: User) => false)
    const bouncer = new Bouncer(new User(1), { editPost })

    assert.isFalse(await bouncer.allows(editPost))
    assert.isTrue(await bouncer.denies(editPost))

    assert.isFalse(await bouncer.allows('editPost'))
    assert.isTrue(await bouncer.denies('editPost'))

    assert.isFalse(await bouncer.allows([PostPolicy, 'viewAll']))
    assert.isTrue(await bouncer.denies([PostPolicy, 'viewAll']))
  })

  test('deny access for guest users', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.action((_: User) => {
      throw new Error('Never executed to be invoked for guest users')
    })
    const actions = { editPost }

    const bouncer = new Bouncer<User, typeof actions>(null, actions)

    assert.isFalse(await bouncer.allows(editPost))
    assert.isTrue(await bouncer.denies(editPost))

    assert.isFalse(await bouncer.allows('editPost'))
    assert.isTrue(await bouncer.denies('editPost'))
  })

  test('deny access for guest users on policy actions', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }

    class PostPolicy extends BasePolicy {
      viewAll(_: User): boolean {
        throw new Error('Never expected to called for guest users')
      }
    }

    const bouncer = new Bouncer<User>(null)

    assert.isFalse(await bouncer.allows([PostPolicy, 'viewAll']))
    assert.isTrue(await bouncer.denies([PostPolicy, 'viewAll']))
  })

  test('execute action when guest users are allowed', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.action(
      (_: User | null) => {
        return true
      },
      { allowGuest: true }
    )
    const actions = { editPost }

    const bouncer = new Bouncer<User, typeof actions>(null, actions)

    assert.isTrue(await bouncer.allows(editPost))
    assert.isFalse(await bouncer.denies(editPost))

    assert.isTrue(await bouncer.allows('editPost'))
    assert.isFalse(await bouncer.denies('editPost'))
  })

  test('execute action for guest users on policy actions when guests are allowed', async ({
    assert,
  }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }

    class PostPolicy extends BasePolicy {
      viewAll(_: User): boolean {
        return true
      }
    }
    PostPolicy.setActionMetaData('viewAll', { allowGuest: true })

    const bouncer = new Bouncer<User>(null)

    assert.isTrue(await bouncer.allows([PostPolicy, 'viewAll']))
    assert.isFalse(await bouncer.denies([PostPolicy, 'viewAll']))
  })
})

test.group('Bouncer | actions | userResolver', () => {
  test('execute action by reference', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.action((_: User) => false)
    const bouncer = new Bouncer(() => new User())

    const response = await bouncer.execute(editPost)
    assert.instanceOf(response, AuthorizationResponse)
    assert.equal(response.authorized, false)
  })

  test('execute action from pre-defined list', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.action((_: User) => false)
    const bouncer = new Bouncer(() => new User(), { editPost })

    const response = await bouncer.execute('editPost')
    assert.instanceOf(response, AuthorizationResponse)
    assert.equal(response.authorized, false)
  })

  test('execute policy action', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      viewAll(_: User) {
        return false
      }
    }

    const bouncer = new Bouncer(() => new User())
    const response = await bouncer.execute([PostPolicy, 'viewAll'])
    assert.instanceOf(response, AuthorizationResponse)
    assert.equal(response.authorized, false)
  })

  test('pass arguments to the action', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }
    class Post {
      constructor(public userId: number) {}
    }

    const editPost = Bouncer.action((user: User, post: Post) => {
      return post.userId === user.id
    })

    const bouncer = new Bouncer(() => new User(1), { editPost })

    const response = await bouncer.execute('editPost', new Post(1))
    assert.instanceOf(response, AuthorizationResponse)
    assert.equal(response.authorized, true)

    const referenceResponse = await bouncer.execute(editPost, new Post(2))
    assert.instanceOf(referenceResponse, AuthorizationResponse)
    assert.equal(referenceResponse.authorized, false)
  })

  test('pass arguments to policy action', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }
    class Post {
      constructor(public userId: number) {}
    }

    class PostPolicy extends BasePolicy {
      viewAll(user: User, post: Post) {
        return post.userId === user.id
      }
    }

    const bouncer = new Bouncer(() => new User(1))
    const response = await bouncer.execute([PostPolicy, 'viewAll'], new Post(1))
    assert.instanceOf(response, AuthorizationResponse)
    assert.equal(response.authorized, true)

    const failingResponse = await bouncer.execute([PostPolicy, 'viewAll'], new Post(2))
    assert.instanceOf(failingResponse, AuthorizationResponse)
    assert.equal(failingResponse.authorized, false)
  })

  test('check if user is allowed or denied to perform an action', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.action((_: User) => false)
    const bouncer = new Bouncer(() => new User(), { editPost })

    assert.isFalse(await bouncer.allows(editPost))
    assert.isTrue(await bouncer.denies(editPost))

    assert.isFalse(await bouncer.allows('editPost'))
    assert.isTrue(await bouncer.denies('editPost'))
  })

  test('check if user is allowed or denied to perform a policy action', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }

    class PostPolicy extends BasePolicy {
      viewAll(_: User) {
        return false
      }
    }

    const editPost = Bouncer.action((_: User) => false)
    const bouncer = new Bouncer(() => new User(1), { editPost })

    assert.isFalse(await bouncer.allows(editPost))
    assert.isTrue(await bouncer.denies(editPost))

    assert.isFalse(await bouncer.allows('editPost'))
    assert.isTrue(await bouncer.denies('editPost'))

    assert.isFalse(await bouncer.allows([PostPolicy, 'viewAll']))
    assert.isTrue(await bouncer.denies([PostPolicy, 'viewAll']))
  })

  test('deny access for guest users', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.action((_: User) => {
      throw new Error('Never executed to be invoked for guest users')
    })
    const actions = { editPost }

    const bouncer = new Bouncer<User, typeof actions>(() => null, actions)

    assert.isFalse(await bouncer.allows(editPost))
    assert.isTrue(await bouncer.denies(editPost))

    assert.isFalse(await bouncer.allows('editPost'))
    assert.isTrue(await bouncer.denies('editPost'))
  })

  test('deny access for guest users on policy actions', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }

    class PostPolicy extends BasePolicy {
      viewAll(_: User): boolean {
        throw new Error('Never expected to called for guest users')
      }
    }

    const bouncer = new Bouncer<User>(() => null)

    assert.isFalse(await bouncer.allows([PostPolicy, 'viewAll']))
    assert.isTrue(await bouncer.denies([PostPolicy, 'viewAll']))
  })

  test('execute action when guest users are allowed', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.action(
      (_: User | null) => {
        return true
      },
      { allowGuest: true }
    )
    const actions = { editPost }

    const bouncer = new Bouncer<User, typeof actions>(() => null, actions)

    assert.isTrue(await bouncer.allows(editPost))
    assert.isFalse(await bouncer.denies(editPost))

    assert.isTrue(await bouncer.allows('editPost'))
    assert.isFalse(await bouncer.denies('editPost'))
  })

  test('execute action for guest users on policy actions when guests are allowed', async ({
    assert,
  }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }

    class PostPolicy extends BasePolicy {
      viewAll(_: User): boolean {
        return true
      }
    }
    PostPolicy.setActionMetaData('viewAll', { allowGuest: true })

    const bouncer = new Bouncer<User>(() => null)

    assert.isTrue(await bouncer.allows([PostPolicy, 'viewAll']))
    assert.isFalse(await bouncer.denies([PostPolicy, 'viewAll']))
  })
})

test.group('Bouncer | policies | extendedChecks', () => {
  test('throw error when policy is not a class', async () => {
    class User {
      declare id: number
      declare email: string
    }

    const bouncer = new Bouncer(new User())
    // @ts-expect-error
    await bouncer.execute([{}, 'viewAll'])
  }).throws('Invalid policy reference. It must be a class constructor')

  test('throw error when policy action is not defined on the class', async () => {
    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {}

    const bouncer = new Bouncer(new User())
    // @ts-expect-error
    await bouncer.execute([PostPolicy, 'viewAll'])
  }).throws('Cannot find method "viewAll" on "[class PostPolicy]"')

  test('constructor policy class using container', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    class Logger {}

    @inject()
    class PostPolicy extends BasePolicy {
      constructor(public logger: Logger) {
        super()
      }

      viewAll(_: User) {
        return this.logger instanceof Logger
      }
    }

    const bouncer = new Bouncer(new User())
    bouncer.setContainerResolver(new Container().createResolver())
    assert.isTrue(await bouncer.allows([PostPolicy, 'viewAll']))
  })
})
