/* @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { Bouncer } from '../src/Bouncer'
import { setup, fs } from '../test-helpers'

let app: ApplicationContract

test.group('Actions Authorizer', (group) => {
  group.each.setup(async () => {
    app = await setup(false)
  })

  group.each.teardown(async () => {
    await fs.cleanup()
  })

  test('return true if a user is allowed to perform an action', async ({ assert }) => {
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1))
    assert.isTrue(await authorizer.allows('viewPost', new Post(1)))
  })

  test('return false if a user is not allowed to perform an action', async ({ assert }) => {
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1))
    assert.isFalse(await authorizer.allows('viewPost', new Post(2)))
  })

  test('return true if a user is denied to perform an action', async ({ assert }) => {
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1))
    assert.isTrue(await authorizer.denies('viewPost', new Post(2)))
  })

  test('return false if a user is not denied to perform an action', async ({ assert }) => {
    class User {
      constructor(public id: number) {}
    }
    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1))
    assert.isFalse(await authorizer.denies('viewPost', new Post(1)))
  })

  test('raise exception when a user is not allowed to perform an action', async ({ assert }) => {
    assert.plan(2)

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1))

    try {
      await authorizer.authorize('viewPost', new Post(2))
    } catch (error) {
      assert.equal(error.message, 'E_AUTHORIZATION_FAILURE: Not authorized to perform this action')
      assert.equal(error.status, 403)
    }
  })

  test('allow custom denial message', async ({ assert }) => {
    assert.plan(2)

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.define('viewPost', (user: User, post: Post) => {
      if (user.id === post.userId) {
        return true
      }
      return ['Cannot access post']
    })

    const authorizer = bouncer.forUser(new User(1))

    try {
      await authorizer.authorize('viewPost', new Post(2))
    } catch (error) {
      assert.equal(error.message, 'E_AUTHORIZATION_FAILURE: Cannot access post')
      assert.equal(error.status, 403)
    }
  })

  test('allow custom denial message with custom status code', async ({ assert }) => {
    assert.plan(2)

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.define('viewPost', (user: User, post: Post) => {
      if (user.id === post.userId) {
        return true
      }
      return ['Post not found', 404]
    })

    const authorizer = bouncer.forUser(new User(1))

    try {
      await authorizer.authorize('viewPost', new Post(2))
    } catch (error) {
      assert.equal(error.message, 'E_AUTHORIZATION_FAILURE: Post not found')
      assert.equal(error.status, 404)
    }
  })

  test('allow switching user at runtime', async ({ assert }) => {
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1))

    assert.isFalse(await authorizer.allows('viewPost', new Post(2)))
    assert.isTrue(await authorizer.forUser(new User(2)).allows('viewPost', new Post(2)))
  })

  test('authorize action from a before hook', async ({ assert }) => {
    let actionInvocationCounts = 0

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.before((user: User) => {
      if (user.isSuperAdmin) {
        return true
      }
    })

    bouncer.define('viewPost', (user: User, post: Post) => {
      actionInvocationCounts++
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isTrue(await authorizer.allows('viewPost', new Post(2)))
    assert.isTrue(await authorizer.forUser(new User(2)).allows('viewPost', new Post(2)))
    assert.equal(actionInvocationCounts, 1)
  })

  test('allow before hook to authorize non-existing actions', async ({ assert }) => {
    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.before(() => {
      return true
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isTrue(await authorizer.allows('viewPost', new Post(2)))
    assert.isTrue(await authorizer.forUser(new User(2)).allows('viewPost', new Post(2)))
  })

  test('allow before hook to deny non-existing actions', async ({ assert }) => {
    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.before(() => {
      return false
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isFalse(await authorizer.allows('viewPost', new Post(2)))
    assert.isFalse(await authorizer.forUser(new User(2)).allows('viewPost', new Post(2)))
  })

  test('raise exception when action is not defined', async ({ assert }) => {
    assert.plan(1)

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.before(() => {
      return
    })

    const authorizer = bouncer.forUser(new User(1, true))
    try {
      await authorizer.allows('viewPost', new Post(2))
    } catch (error) {
      assert.equal(
        error.message,
        'Cannot run "viewPost" action. Make sure it is defined inside the "start/bouncer" file'
      )
    }
  })

  test('authorize action from an after hook', async ({ assert }) => {
    let actionInvocationCounts = 0

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.after((user: User, _, result) => {
      if (user.isSuperAdmin) {
        assert.deepEqual(result.errorResponse, ['Not authorized to perform this action', 403])
        return true
      }
    })

    bouncer.define('viewPost', (user: User, post: Post) => {
      actionInvocationCounts++
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isTrue(await authorizer.allows('viewPost', new Post(2)))
    assert.isTrue(await authorizer.forUser(new User(2)).allows('viewPost', new Post(2)))
    assert.equal(actionInvocationCounts, 2)
  })

  test('deny action from an after hook', async ({ assert }) => {
    let actionInvocationCounts = 0

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.after(() => {
      return false
    })

    bouncer.define('viewPost', (user: User, post: Post) => {
      actionInvocationCounts++
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isFalse(await authorizer.allows('viewPost', new Post(2)))
    assert.isFalse(await authorizer.forUser(new User(2)).allows('viewPost', new Post(2)))
    assert.equal(actionInvocationCounts, 2)
  })

  test('forwaded action response as it is', async ({ assert }) => {
    let actionInvocationCounts = 0

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.after(() => {
      return
    })

    bouncer.define('viewPost', (user: User, post: Post) => {
      actionInvocationCounts++
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isFalse(await authorizer.allows('viewPost', new Post(2)))
    assert.isTrue(await authorizer.forUser(new User(2)).allows('viewPost', new Post(2)))
    assert.equal(actionInvocationCounts, 2)
  })

  test('run the action callback when hooks skips the authorization', async ({ assert }) => {
    let hooksInvocationCounts = 0

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.before(() => {
      hooksInvocationCounts++
    })
    bouncer.before(() => {
      hooksInvocationCounts++
    })

    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isFalse(await authorizer.allows('viewPost', new Post(2)))
    assert.isTrue(await authorizer.forUser(new User(2)).allows('viewPost', new Post(2)))
    assert.equal(hooksInvocationCounts, 4)
  })

  test('do not run the next hook when first one authorizes the action', async ({ assert }) => {
    let hooksInvocationCounts = 0

    class User {
      constructor(public id: number, public isSuperAdmin: boolean = false) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.before((user: User) => {
      hooksInvocationCounts++
      if (user.isSuperAdmin) {
        return true
      }
    })

    bouncer.before(() => {
      hooksInvocationCounts++
    })

    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1, true))
    assert.isTrue(await authorizer.allows('viewPost', new Post(2)))
    assert.isTrue(await authorizer.forUser(new User(2)).allows('viewPost', new Post(2)))
    assert.equal(hooksInvocationCounts, 3)
  })

  test('do not attempt authorization when user is missing', async ({ assert }) => {
    let actionInvocationCounts = 0

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.define('viewPost', (user: User, post: Post) => {
      actionInvocationCounts++
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(null)

    assert.isFalse(await authorizer.allows('viewPost', new Post(1)))
    assert.equal(actionInvocationCounts, 0)
  })

  test('do invoke before callback when user is missing', async ({ assert }) => {
    let actionInvocationCounts = 0
    assert.plan(3)

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.before((user) => {
      assert.isNull(user)
    })

    bouncer.define('viewPost', (user: User, post: Post) => {
      actionInvocationCounts++
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(null)

    assert.isFalse(await authorizer.allows('viewPost', new Post(1)))
    assert.equal(actionInvocationCounts, 0)
  })

  test('do attempt authorization when user is missing and guest is allowed', async ({ assert }) => {
    let actionInvocationCounts = 0

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)

    bouncer.define(
      'viewPost',
      (user: User | null, post: Post) => {
        actionInvocationCounts++

        if (!user) {
          return true
        }

        return user.id === post.userId
      },
      { allowGuest: true }
    )

    const authorizer = bouncer.forUser(null)

    assert.isTrue(await authorizer.allows('viewPost', new Post(1)))
    assert.equal(actionInvocationCounts, 1)
  })

  test('authorize action using the can/cannot method', async ({ assert }) => {
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1))
    assert.isTrue(await authorizer.can('viewPost', new Post(1)))
    assert.isFalse(await authorizer.cannot('viewPost', new Post(1)))
  })

  test('authorize action using the can/cannot for a custom user', async ({ assert }) => {
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(2))
    assert.isTrue(await authorizer.can('viewPost', authorizer.forUser(new User(1)), new Post(1)))
    assert.isFalse(
      await authorizer.cannot('viewPost', authorizer.forUser(new User(1)), new Post(1))
    )
  })

  test('resolve user using the resolver function', async ({ assert }) => {
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(() => new User(1))
    assert.isTrue(await authorizer.allows('viewPost', new Post(1)))
  })
})

test.group('Actions Authorizer | Profile', (group) => {
  group.each.setup(async () => {
    app = await setup(false)
  })

  group.each.teardown(async () => {
    await fs.cleanup()
  })

  test('profile authorization calls', async ({ assert }) => {
    const profilePackets: any[] = []

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1))
    authorizer.setProfiler(app.profiler)

    app.profiler.processor = function (packet) {
      profilePackets.push(packet)
    }

    assert.isTrue(await authorizer.allows('viewPost', new Post(1)))

    assert.lengthOf(profilePackets, 2)
    assert.equal(profilePackets[0].label, 'bouncer:action')
    assert.deepEqual(profilePackets[0].data, { action: 'viewPost', handler: 'anonymous' })
    assert.deepEqual(profilePackets[0].parent_id, profilePackets[1].id)

    assert.equal(profilePackets[1].label, 'bouncer:authorize')
    assert.deepEqual(profilePackets[1].data, {
      action: 'viewPost',
      authorized: true,
      errorResponse: null,
    })
  })

  test('profile when action raises an exception', async ({ assert }) => {
    assert.plan(9)
    const profilePackets: any[] = []

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.define('viewPost', () => {
      throw new Error('bad request')
    })

    const authorizer = bouncer.forUser(new User(1))
    authorizer.setProfiler(app.profiler)

    app.profiler.processor = function (packet) {
      profilePackets.push(packet)
    }

    try {
      await authorizer.allows('viewPost', new Post(1))
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

  test('profile hooks', async ({ assert }) => {
    const profilePackets: any[] = []

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.before(() => {
      return
    })

    bouncer.after(() => {
      return
    })

    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1))
    authorizer.setProfiler(app.profiler)

    app.profiler.processor = function (packet) {
      profilePackets.push(packet)
    }

    assert.isTrue(await authorizer.allows('viewPost', new Post(1)))

    assert.lengthOf(profilePackets, 4)
    assert.equal(profilePackets[0].label, 'bouncer:hook')
    assert.deepEqual(profilePackets[0].data, {
      action: 'viewPost',
      handler: 'anonymous',
      lifecycle: 'before',
    })
    assert.equal(profilePackets[0].parent_id, profilePackets[3].id)

    assert.equal(profilePackets[1].label, 'bouncer:action')
    assert.deepEqual(profilePackets[1].data, {
      action: 'viewPost',
      handler: 'anonymous',
    })
    assert.equal(profilePackets[1].parent_id, profilePackets[3].id)

    assert.equal(profilePackets[2].label, 'bouncer:hook')
    assert.deepEqual(profilePackets[2].data, {
      action: 'viewPost',
      handler: 'anonymous',
      lifecycle: 'after',
    })
    assert.equal(profilePackets[2].parent_id, profilePackets[3].id)

    assert.equal(profilePackets[3].label, 'bouncer:authorize')
    assert.deepEqual(profilePackets[3].data, {
      action: 'viewPost',
      authorized: true,
      errorResponse: null,
    })
  })

  test('profile when before hook raises an exception', async ({ assert }) => {
    assert.plan(9)

    const profilePackets: any[] = []

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.before(() => {
      throw new Error('bad request')
    })

    bouncer.after(() => {
      return
    })

    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1))
    authorizer.setProfiler(app.profiler)

    app.profiler.processor = function (packet) {
      profilePackets.push(packet)
    }

    try {
      await authorizer.allows('viewPost', new Post(1))
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

  test('profile when after hook raises an exception', async ({ assert }) => {
    assert.plan(15)

    const profilePackets: any[] = []

    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.before(() => {})

    bouncer.after(() => {
      throw new Error('bad request')
    })

    bouncer.define('viewPost', (user: User, post: Post) => {
      return user.id === post.userId
    })

    const authorizer = bouncer.forUser(new User(1))
    authorizer.setProfiler(app.profiler)

    app.profiler.processor = function (packet) {
      profilePackets.push(packet)
    }

    try {
      await authorizer.allows('viewPost', new Post(1))
    } catch (error) {
      assert.lengthOf(profilePackets, 4)
      assert.equal(profilePackets[0].label, 'bouncer:hook')
      assert.deepEqual(profilePackets[0].data, {
        action: 'viewPost',
        handler: 'anonymous',
        lifecycle: 'before',
      })
      assert.equal(profilePackets[0].parent_id, profilePackets[3].id)

      assert.equal(profilePackets[1].label, 'bouncer:action')
      assert.deepEqual(profilePackets[1].data, {
        action: 'viewPost',
        handler: 'anonymous',
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
