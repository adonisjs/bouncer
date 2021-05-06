/* @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'

import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { Bouncer } from '../src/Bouncer'
import { setup, fs } from '../test-helpers'
import { AuthorizationResult } from '@ioc:Adonis/Addons/Bouncer'

let app: ApplicationContract

test.group('Policy Authorizer', (group) => {
  group.beforeEach(async () => {
    app = await setup(false)
  })

  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('return true if a user is allowed to perform an action', async (assert) => {
    const bouncer = new Bouncer(app)
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))
    assert.isTrue(await authorizer.with('UserPolicy').allows('viewPost', new Post(1)))
  })

  test('return false if a user is not allowed to perform an action', async (assert) => {
    const bouncer = new Bouncer(app)
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))
    assert.isFalse(await authorizer.with('UserPolicy').allows('viewPost', new Post(2)))
  })

  test('return true if a user is denied to perform an action', async (assert) => {
    const bouncer = new Bouncer(app)
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))
    assert.isTrue(await authorizer.with('UserPolicy').denies('viewPost', new Post(2)))
  })

  test('return false if a user is not denied to perform an action', async (assert) => {
    const bouncer = new Bouncer(app)
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))
    assert.isFalse(await authorizer.with('UserPolicy').denies('viewPost', new Post(1)))
  })

  test('raise exception when a user is not allowed to perform an action', async (assert) => {
    assert.plan(2)

    const bouncer = new Bouncer(app)
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))

    try {
      await authorizer.with('UserPolicy').authorize('viewPost', new Post(2))
    } catch (error) {
      assert.equal(error.message, 'E_AUTHORIZATION_FAILURE: Not authorized to perform this action')
      assert.equal(error.status, 403)
    }
  })

  test('allow custom denial message', async (assert) => {
    assert.plan(2)

    const bouncer = new Bouncer(app)
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        if (user.id === post.userId) {
          return true
        }
        return ['Cannot access post']
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))

    try {
      await authorizer.with('UserPolicy').authorize('viewPost', new Post(2))
    } catch (error) {
      assert.equal(error.message, 'E_AUTHORIZATION_FAILURE: Cannot access post')
      assert.equal(error.status, 403)
    }
  })

  test('allow custom denial message with custom status code', async (assert) => {
    assert.plan(2)

    const bouncer = new Bouncer(app)
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        if (user.id === post.userId) {
          return true
        }
        return ['Post not found', 404]
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))

    try {
      await authorizer.with('UserPolicy').authorize('viewPost', new Post(2))
    } catch (error) {
      assert.equal(error.message, 'E_AUTHORIZATION_FAILURE: Post not found')
      assert.equal(error.status, 404)
    }
  })

  test('allow switching user at runtime', async (assert) => {
    const bouncer = new Bouncer(app)
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))

    assert.isFalse(await authorizer.with('UserPolicy').allows('viewPost', new Post(2)))
    assert.isTrue(
      await authorizer.forUser(new User(2)).with('UserPolicy').allows('viewPost', new Post(2))
    )
    assert.isTrue(
      await authorizer.with('UserPolicy').forUser(new User(2)).allows('viewPost', new Post(2))
    )
  })

  test('authorize action from a before hook', async (assert) => {
    let actionInvocationCounts = 0
    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public before(user: User) {
        if (user.isSuperAdmin) {
          return true
        }
      }

      public viewPost(user: User, post: Post) {
        actionInvocationCounts++
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isTrue(await authorizer.with('UserPolicy').allows('viewPost', new Post(2)))
    assert.isTrue(
      await authorizer.with('UserPolicy').forUser(new User(2)).allows('viewPost', new Post(2))
    )
    assert.equal(actionInvocationCounts, 1)
  })

  test('allow before hook to authorize non-existing actions', async (assert) => {
    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public before() {
        return true
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isTrue(await authorizer.with('UserPolicy').allows('viewPost', new Post(2)))
    assert.isTrue(
      await authorizer.with('UserPolicy').forUser(new User(2)).allows('viewPost', new Post(2))
    )
  })

  test('allow before hook to deny non-existing actions', async (assert) => {
    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public before() {
        return false
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isFalse(await authorizer.with('UserPolicy').allows('viewPost', new Post(2)))
    assert.isFalse(
      await authorizer.with('UserPolicy').forUser(new User(2)).allows('viewPost', new Post(2))
    )
  })

  test('raise exception when action is not defined', async (assert) => {
    assert.plan(1)
    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public before() {}
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1, true))
    try {
      await authorizer.with('UserPolicy').allows('viewPost', new Post(2))
    } catch (error) {
      assert.equal(
        error.message,
        'Cannot run "viewPost" action. Make sure it is defined on the "UserPolicy" class'
      )
    }
  })

  test('authorize action from an after hook', async (assert) => {
    let actionInvocationCounts = 0
    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public after(user: User, _: string, result: AuthorizationResult) {
        if (user.isSuperAdmin) {
          assert.deepEqual(result.errorResponse, ['Not authorized to perform this action', 403])
          return true
        }
      }

      public viewPost(user: User, post: Post) {
        actionInvocationCounts++
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isTrue(await authorizer.with('UserPolicy').allows('viewPost', new Post(2)))
    assert.isTrue(
      await authorizer.forUser(new User(2)).with('UserPolicy').allows('viewPost', new Post(2))
    )
    assert.equal(actionInvocationCounts, 2)
  })

  test('deny action from an after hook', async (assert) => {
    let actionInvocationCounts = 0
    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public after() {
        return false
      }

      public viewPost(user: User, post: Post) {
        actionInvocationCounts++
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isFalse(await authorizer.with('UserPolicy').allows('viewPost', new Post(2)))
    assert.isFalse(
      await authorizer.forUser(new User(2)).with('UserPolicy').allows('viewPost', new Post(2))
    )
    assert.equal(actionInvocationCounts, 2)
  })

  test('forwaded action response from after hook as it is', async (assert) => {
    let actionInvocationCounts = 0
    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public after() {}

      public viewPost(user: User, post: Post) {
        actionInvocationCounts++
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isFalse(await authorizer.with('UserPolicy').allows('viewPost', new Post(2)))
    assert.isTrue(
      await authorizer.forUser(new User(2)).with('UserPolicy').allows('viewPost', new Post(2))
    )
    assert.equal(actionInvocationCounts, 2)
  })

  test('do not attempt authorization when user is missing', async (assert) => {
    let actionInvocationCounts = 0
    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public after() {}

      public viewPost(user: User, post: Post) {
        actionInvocationCounts++
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(null)

    assert.isFalse(await authorizer.with('UserPolicy').allows('viewPost', new Post(1)))
    assert.equal(actionInvocationCounts, 0)
  })

  test('do invoke "before" hook when user is missing', async (assert) => {
    let actionInvocationCounts = 0
    assert.plan(3)

    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public before(user: User) {
        assert.isNull(user)
      }

      public viewPost(user: User, post: Post) {
        actionInvocationCounts++
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(null)

    assert.isFalse(await authorizer.with('UserPolicy').allows('viewPost', new Post(1)))
    assert.equal(actionInvocationCounts, 0)
  })

  test('do attempt authorization when user is missing and guest is allowed', async (assert) => {
    let actionInvocationCounts = 0

    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public before(user: User) {
        assert.isNull(user)
      }

      public viewPost(user: User, post: Post) {
        actionInvocationCounts++

        if (!user) {
          return true
        }

        return user.id === post.userId
      }
    }

    UserPolicy.boot()
    UserPolicy.storeActionOptions('viewPost', { allowGuest: true })

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(null)

    assert.isTrue(await authorizer.with('UserPolicy').allows('viewPost', new Post(1)))
    assert.equal(actionInvocationCounts, 1)
  })

  test('allow guest via decorator', async (assert) => {
    let actionInvocationCounts = 0

    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public before(user: User) {
        assert.isNull(user)
      }

      @bouncer.action({ allowGuest: true })
      public viewPost(user: User, post: Post) {
        actionInvocationCounts++

        if (!user) {
          return true
        }

        return user.id === post.userId
      }
    }

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(null)

    assert.isTrue(await authorizer.with('UserPolicy').allows('viewPost', new Post(1)))
    assert.equal(actionInvocationCounts, 1)
  })

  test('authorize using the can/cannot method', async (assert) => {
    const bouncer = new Bouncer(app)
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))
    assert.isTrue(await authorizer.can('UserPolicy.viewPost', new Post(1)))
    assert.isFalse(await authorizer.cannot('UserPolicy.viewPost', new Post(1)))
  })

  test('authorize using the can/cannot method for a custom user', async (assert) => {
    const bouncer = new Bouncer(app)
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(2))
    assert.isTrue(
      await authorizer.can('UserPolicy.viewPost', bouncer.forUser(new User(1)), new Post(1))
    )
    assert.isFalse(
      await authorizer.cannot('UserPolicy.viewPost', bouncer.forUser(new User(1)), new Post(1))
    )
  })

  test('raise exception when using invalid policy name via can/cannot method', async (assert) => {
    assert.plan(1)

    const bouncer = new Bouncer(app)
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))
    try {
      await authorizer.can('UPolicy.viewPost', new Post(1))
    } catch ({ message }) {
      assert.equal(
        message,
        'Cannot use "UPolicy" policy. Make sure it is defined as a function inside "start/bouncer" file'
      )
    }
  })

  test('pass resolver to the policy when using with method', async (assert) => {
    const bouncer = new Bouncer(app)
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    let i = 0
    const authorizer = bouncer.forUser(() => {
      return new User(++i)
    })

    assert.isTrue(await authorizer.allows('viewPost', new Post(1)))
    assert.isTrue(await authorizer.with('UserPolicy').allows('viewPost', new Post(2)))
  })
})

test.group('Actions Authorizer | Profile', (group) => {
  group.beforeEach(async () => {
    app = await setup(false)
  })

  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('profile authorization calls', async (assert) => {
    const profilePackets: any[] = []
    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }
    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))
    authorizer.setProfiler(app.profiler)

    app.profiler.processor = function (packet) {
      profilePackets.push(packet)
    }

    assert.isTrue(await authorizer.with('UserPolicy').allows('viewPost', new Post(1)))

    assert.lengthOf(profilePackets, 2)
    assert.equal(profilePackets[0].label, 'bouncer:action')
    assert.deepEqual(profilePackets[0].data, { action: 'viewPost', handler: 'viewPost' })
    assert.deepEqual(profilePackets[0].parent_id, profilePackets[1].id)

    assert.equal(profilePackets[1].label, 'bouncer:authorize')
    assert.deepEqual(profilePackets[1].data, {
      action: 'viewPost',
      authorized: true,
      policy: 'UserPolicy',
      errorResponse: null,
    })
  })

  test('profile when action raises an exception', async (assert) => {
    assert.plan(9)
    const profilePackets: any[] = []
    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public viewPost() {
        throw new Error('bad request')
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))
    authorizer.setProfiler(app.profiler)

    app.profiler.processor = function (packet) {
      profilePackets.push(packet)
    }

    try {
      await authorizer.with('UserPolicy').allows('viewPost', new Post(1))
    } catch (error) {
      assert.lengthOf(profilePackets, 2)
      assert.equal(profilePackets[0].label, 'bouncer:action')
      assert.equal(profilePackets[0].data.action, 'viewPost')
      assert.equal(profilePackets[0].data.error.message, 'bad request')
      assert.deepEqual(profilePackets[0].parent_id, profilePackets[1].id)

      assert.equal(profilePackets[1].label, 'bouncer:authorize')
      assert.equal(profilePackets[1].data.action, 'viewPost')
      assert.isFalse(profilePackets[1].data.authorized)
      assert.equal(profilePackets[1].data.error.message, 'bad request')
    }
  })

  test('profile hooks', async (assert) => {
    const profilePackets: any[] = []
    const bouncer = new Bouncer(app)

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public before() {}
      public after() {}
      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))
    authorizer.setProfiler(app.profiler)

    app.profiler.processor = function (packet) {
      profilePackets.push(packet)
    }

    assert.isTrue(await authorizer.with('UserPolicy').allows('viewPost', new Post(1)))

    assert.lengthOf(profilePackets, 4)
    assert.equal(profilePackets[0].label, 'bouncer:hook')
    assert.deepEqual(profilePackets[0].data, {
      action: 'viewPost',
      handler: 'before',
      lifecycle: 'before',
    })
    assert.equal(profilePackets[0].parent_id, profilePackets[3].id)

    assert.equal(profilePackets[1].label, 'bouncer:action')
    assert.deepEqual(profilePackets[1].data, {
      action: 'viewPost',
      handler: 'viewPost',
    })
    assert.equal(profilePackets[1].parent_id, profilePackets[3].id)

    assert.equal(profilePackets[2].label, 'bouncer:hook')
    assert.deepEqual(profilePackets[2].data, {
      action: 'viewPost',
      handler: 'after',
      lifecycle: 'after',
    })
    assert.equal(profilePackets[2].parent_id, profilePackets[3].id)

    assert.equal(profilePackets[3].label, 'bouncer:authorize')
    assert.deepEqual(profilePackets[3].data, {
      action: 'viewPost',
      policy: 'UserPolicy',
      authorized: true,
      errorResponse: null,
    })
  })

  test('profile when before hook raises an exception', async (assert) => {
    assert.plan(9)
    const bouncer = new Bouncer(app)

    const profilePackets: any[] = []

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class UserPolicy extends bouncer.BasePolicy {
      public before() {
        throw new Error('bad request')
      }

      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))
    authorizer.setProfiler(app.profiler)

    app.profiler.processor = function (packet) {
      profilePackets.push(packet)
    }

    try {
      await authorizer.with('UserPolicy').allows('viewPost', new Post(1))
    } catch (error) {
      assert.lengthOf(profilePackets, 2)
      assert.equal(profilePackets[0].label, 'bouncer:hook')
      assert.equal(profilePackets[0].data.action, 'viewPost')
      assert.equal(profilePackets[0].data.error.message, 'bad request')
      assert.equal(profilePackets[0].parent_id, profilePackets[1].id)

      assert.equal(profilePackets[1].label, 'bouncer:authorize')
      assert.equal(profilePackets[1].data.action, 'viewPost')
      assert.isFalse(profilePackets[1].data.authorized)
      assert.equal(profilePackets[1].data.error.message, 'bad request')
    }
  })

  test('profile when after hook raises an exception', async (assert) => {
    assert.plan(15)

    const profilePackets: any[] = []

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    class UserPolicy extends bouncer.BasePolicy {
      public before() {}

      public after() {
        throw new Error('bad request')
      }

      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    UserPolicy.boot()

    bouncer.registerPolicies({
      UserPolicy: async () => {
        return { default: UserPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))
    authorizer.setProfiler(app.profiler)

    app.profiler.processor = function (packet) {
      profilePackets.push(packet)
    }

    try {
      await authorizer.with('UserPolicy').allows('viewPost', new Post(1))
    } catch (error) {
      assert.lengthOf(profilePackets, 4)
      assert.equal(profilePackets[0].label, 'bouncer:hook')
      assert.deepEqual(profilePackets[0].data, {
        action: 'viewPost',
        handler: 'before',
        lifecycle: 'before',
      })
      assert.equal(profilePackets[0].parent_id, profilePackets[3].id)

      assert.equal(profilePackets[1].label, 'bouncer:action')
      assert.deepEqual(profilePackets[1].data, {
        action: 'viewPost',
        handler: 'viewPost',
      })
      assert.equal(profilePackets[1].parent_id, profilePackets[3].id)

      assert.equal(profilePackets[2].label, 'bouncer:hook')
      assert.equal(profilePackets[2].data.action, 'viewPost')
      assert.equal(profilePackets[2].data.error.message, 'bad request')
      assert.equal(profilePackets[2].parent_id, profilePackets[3].id)

      assert.equal(profilePackets[3].label, 'bouncer:authorize')
      assert.equal(profilePackets[3].data.action, 'viewPost')
      assert.isFalse(profilePackets[3].data.authorized)
      assert.equal(profilePackets[3].data.error.message, 'bad request')
    }
  })
})
