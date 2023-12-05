/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { inject } from '@adonisjs/core'
import { Container } from '@adonisjs/core/container'

import { Bouncer } from '../../src/bouncer.js'
import { BasePolicy } from '../../src/base_policy.js'
import { allowGuest } from '../../src/decorators/action.js'
import type { AuthorizerResponse } from '../../src/types.js'
import { AuthorizationResponse } from '../../src/response.js'
import { createEmitter } from '../helpers.js'

test.group('Bouncer | policies | types', () => {
  test('assert with method arguments with policy reference', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    class StaffPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: Admin): AuthorizerResponse {
        return true
      }

      viewAll(_: Admin): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer(new User())

    /**
     * Both policy references should work, because we cannot infer
     * in advance if all the methods of a given policy works
     * with a specific user type or not.
     */
    bouncer.with(PostPolicy)
    bouncer.with(StaffPolicy)

    // @ts-expect-error
    bouncer.with({})
    // @ts-expect-error
    bouncer.with('foo')
    // @ts-expect-error
    bouncer.with(new StaffPolicy())
  }).throws('Invalid bouncer policy "{}"')

  test('assert with method arguments with pre-registered policies', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    class StaffPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: Admin): AuthorizerResponse {
        return true
      }

      viewAll(_: Admin): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer(new User(), undefined, {
      PostPolicy: async () => {
        return {
          default: PostPolicy,
        }
      },
      StaffPolicy: async () => {
        return {
          default: StaffPolicy,
        }
      },
    })

    /**
     * Both policy references should work, because we cannot infer
     * in advance if all the methods of a given policy works
     * with a specific user type or not.
     */
    bouncer.with('PostPolicy')
    bouncer.with('StaffPolicy')

    // @ts-expect-error
    bouncer.with({})
    // @ts-expect-error
    bouncer.with('foo')
    // @ts-expect-error
    bouncer.with(new StaffPolicy())
  }).throws('Invalid bouncer policy "{}"')

  test('infer policy methods', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    class StaffPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: Admin): AuthorizerResponse {
        return true
      }

      viewAll(_: Admin): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer(new User())

    /**
     * Both policy references should work, because we cannot infer
     * in advance if all the methods of a given policy works
     * with a specific user type or not.
     */
    await bouncer.with(PostPolicy).execute('view')
    await bouncer.with(PostPolicy).execute('viewAll')

    /**
     * The resolvePermission method does not accept the user
     * and neither returns AuthorizerResponse
     */
    // @ts-expect-error
    await bouncer.with(PostPolicy).execute('resolvePermissions')

    /**
     * The StaffPolicy methods works with Admin class and hence
     * they cannot be used with a bouncer instance created for
     * the User class
     */
    // @ts-expect-error
    bouncer.with(StaffPolicy).execute('view')
    // @ts-expect-error
    bouncer.with(StaffPolicy).execute('viewAll')
    // @ts-expect-error
    bouncer.with(StaffPolicy).execute('resolvePermissions')
  })

  test('infer policy methods of a pre-registered policy', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    class StaffPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: Admin): AuthorizerResponse {
        return true
      }

      viewAll(_: Admin): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer(new User(), undefined, {
      PostPolicy: async () => {
        return {
          default: PostPolicy,
        }
      },
      StaffPolicy: async () => {
        return {
          default: StaffPolicy,
        }
      },
    })

    /**
     * Both policy references should work, because we cannot infer
     * in advance if all the methods of a given policy works
     * with a specific user type or not.
     */
    await bouncer.with('PostPolicy').execute('view')
    await bouncer.with('PostPolicy').execute('viewAll')

    /**
     * The resolvePermission method does not accept the user
     * and neither returns AuthorizerResponse
     */
    // @ts-expect-error
    await bouncer.with('PostPolicy').execute('resolvePermissions')

    /**
     * The StaffPolicy methods works with Admin class and hence
     * they cannot be used with a bouncer instance created for
     * the User class
     */
    // @ts-expect-error
    bouncer.with('StaffPolicy').execute('view')
    // @ts-expect-error
    bouncer.with('StaffPolicy').execute('viewAll')
    // @ts-expect-error
    bouncer.with('StaffPolicy').execute('resolvePermissions')
  })

  test('infer policy method arguments', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Post {
      declare userId: null
      declare title: string
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(user: User, post: Post): AuthorizerResponse {
        return user.id === post.userId
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer(new User())

    /**
     * Both policy references should work, because we cannot infer
     * in advance if all the methods of a given policy works
     * with a specific user type or not.
     */
    await bouncer.with(PostPolicy).execute('view', new Post())
    await bouncer.with(PostPolicy).execute('viewAll')

    /**
     * Fails because we are not passing an instance of the post
     * class
     */
    // @ts-expect-error
    await bouncer.with(PostPolicy).execute('view')

    /**
     * The resolvePermission method does not accept the user
     * and neither returns AuthorizerResponse
     */
    // @ts-expect-error
    await bouncer.with(PostPolicy).execute('resolvePermissions')
  }).throws(`Cannot read properties of undefined (reading 'userId')`)

  test('infer policy method arguments of a pre-registered policy', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Post {
      declare userId: null
      declare title: string
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(user: User, post: Post): AuthorizerResponse {
        return user.id === post.userId
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer(new User(), undefined, {
      PostPolicy: async () => {
        return {
          default: PostPolicy,
        }
      },
    })

    /**
     * Both policy references should work, because we cannot infer
     * in advance if all the methods of a given policy works
     * with a specific user type or not.
     */
    await bouncer.with('PostPolicy').execute('view', new Post())
    await bouncer.with('PostPolicy').execute('viewAll')

    /**
     * Fails because we are not passing an instance of the post
     * class
     */
    // @ts-expect-error
    await bouncer.with('PostPolicy').execute('view')

    /**
     * The resolvePermission method does not accept the user
     * and neither returns AuthorizerResponse
     */
    // @ts-expect-error
    await bouncer.with('PostPolicy').execute('resolvePermissions')
  }).throws(`Cannot read properties of undefined (reading 'userId')`)

  test('infer policy methods for guest users', async () => {
    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User | null): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer(new User())

    /**
     * Both policy references should work, because we cannot infer
     * in advance if all the methods of a given policy works
     * with a specific user type or not.
     */
    await bouncer.with(PostPolicy).execute('view')
    await bouncer.with(PostPolicy).execute('viewAll')

    /**
     * The resolvePermission method does not accept the user
     * and neither returns AuthorizerResponse
     */
    // @ts-expect-error
    await bouncer.with(PostPolicy).execute('resolvePermissions')
  })

  test('infer policy methods for union of users', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User | Admin): AuthorizerResponse {
        return true
      }

      viewAll(_: User | Admin): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer<User | Admin>(new User())

    /**
     * Both policy references should work, because we cannot infer
     * in advance if all the methods of a given policy works
     * with a specific user type or not.
     */
    await bouncer.with(PostPolicy).execute('view')
    await bouncer.with(PostPolicy).execute('viewAll')

    /**
     * The resolvePermission method does not accept the user
     * and neither returns AuthorizerResponse
     */
    // @ts-expect-error
    await bouncer.with(PostPolicy).execute('resolvePermissions')
  })
})

test.group('Bouncer | policies', () => {
  test('execute policy action', async ({ assert }, done) => {
    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    const emitter = createEmitter()
    const bouncer = new Bouncer(new User())
    bouncer.setEmitter(emitter)

    emitter.on('authorization:finished', (event) => {
      assert.instanceOf(event.user, User)
      assert.equal(event.action, 'PostPolicy.view')
      assert.deepEqual(event.parameters, [])
      assert.instanceOf(event.response, AuthorizationResponse)
      done()
    })

    const canView = await bouncer.with(PostPolicy).execute('view')
    assert.isTrue(canView.authorized)

    bouncer.setEmitter(undefined)

    const canViewAll = await bouncer.with(PostPolicy).execute('viewAll')
    assert.isFalse(canViewAll.authorized)
  }).waitForDone()

  test('execute policy action on a pre-registered policy', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer(new User(), undefined, {
      PostPolicy: async () => {
        return {
          default: PostPolicy,
        }
      },
    })

    const postsPolicy = bouncer.with('PostPolicy')

    const canView = await postsPolicy.execute('view')
    assert.isTrue(canView.authorized)

    const canViewAll = await postsPolicy.execute('viewAll')
    assert.isFalse(canViewAll.authorized)
  })

  test('cache lazily imported policies', async ({ assert }) => {
    let importsCounter: number = 0

    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer(new User(), undefined, {
      PostPolicy: async () => {
        importsCounter++
        return {
          default: PostPolicy,
        }
      },
    })
    const canView = await bouncer.with('PostPolicy').execute('view')
    assert.isTrue(canView.authorized)

    const canViewAll = await bouncer.with('PostPolicy').execute('viewAll')
    assert.isFalse(canViewAll.authorized)

    assert.equal(importsCounter, 1)
  })

  test('cache lazily imported policies across bouncer instances', async ({ assert }) => {
    let importsCounter: number = 0

    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    const policies = {
      PostPolicy: async () => {
        importsCounter++
        return {
          default: PostPolicy,
        }
      },
    }

    const bouncer = new Bouncer(new User(), undefined, policies)
    const bouncer1 = new Bouncer(new User(), undefined, policies)

    const canView = await bouncer.with('PostPolicy').execute('view')
    assert.isTrue(canView.authorized)

    const canViewAll = await bouncer1.with('PostPolicy').execute('viewAll')
    assert.isFalse(canViewAll.authorized)

    assert.equal(importsCounter, 1)
  })

  test('do not cache lazily imported policies when import function is not shared by reference', async ({
    assert,
  }) => {
    let importsCounter: number = 0

    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer(new User(), undefined, {
      PostPolicy: async () => {
        importsCounter++
        return {
          default: PostPolicy,
        }
      },
    })
    const bouncer1 = new Bouncer(new User(), undefined, {
      PostPolicy: async () => {
        importsCounter++
        return {
          default: PostPolicy,
        }
      },
    })

    const canView = await bouncer.with('PostPolicy').execute('view')
    assert.isTrue(canView.authorized)

    const canViewAll = await bouncer1.with('PostPolicy').execute('viewAll')
    assert.isFalse(canViewAll.authorized)

    assert.equal(importsCounter, 2)
  })

  test('deny access when authorizing for guests', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer<User>(null)
    const canView = await bouncer.with(PostPolicy).execute('view')
    assert.isFalse(canView.authorized)

    const canViewAll = await bouncer.with(PostPolicy).execute('viewAll')
    assert.isFalse(canViewAll.authorized)
  })

  test('invoke action that allows guest users', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      @allowGuest()
      view(_: User | null): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer<User>(null)
    const canView = await bouncer.with(PostPolicy).execute('view')
    assert.isTrue(canView.authorized)

    const canViewAll = await bouncer.with(PostPolicy).execute('viewAll')
    assert.isFalse(canViewAll.authorized)
  })

  test('throw error when policy method is not defined', async () => {
    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer(new User(), undefined, {
      PostPolicy: async () => {
        return {
          default: PostPolicy,
        }
      },
    })

    const postsPolicy = bouncer.with('PostPolicy')

    // @ts-expect-error
    await postsPolicy.execute('foo')
  }).throws('Cannot find method "foo" on "[class PostPolicy]"')

  test('construct policy using the container', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    class PermissionsResolver {
      resolve() {
        return ['can-view']
      }
    }

    @inject()
    class PostPolicy extends BasePolicy {
      constructor(protected permissionsResolver: PermissionsResolver) {
        super()
      }

      view(_: User): AuthorizerResponse {
        return this.permissionsResolver.resolve().includes('can-view')
      }

      viewAll(_: User): AuthorizerResponse {
        return this.permissionsResolver.resolve().includes('can-view-all')
      }
    }

    const bouncer = new Bouncer(new User())
    bouncer.setContainerResolver(new Container().createResolver())

    const canView = await bouncer.with(PostPolicy).execute('view')
    assert.isTrue(canView.authorized)

    const canViewAll = await bouncer.with(PostPolicy).execute('viewAll')
    assert.isFalse(canViewAll.authorized)
  })

  test('construct pre-registered policy using the container', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    class PermissionsResolver {
      resolve() {
        return ['can-view']
      }
    }

    @inject()
    class PostPolicy extends BasePolicy {
      constructor(protected permissionsResolver: PermissionsResolver) {
        super()
      }

      view(_: User): AuthorizerResponse {
        return this.permissionsResolver.resolve().includes('can-view')
      }

      viewAll(_: User): AuthorizerResponse {
        return this.permissionsResolver.resolve().includes('can-view-all')
      }
    }

    const bouncer = new Bouncer(new User(), undefined, {
      PostPolicy: async () => {
        return {
          default: PostPolicy,
        }
      },
    })
    bouncer.setContainerResolver(new Container().createResolver())

    const canView = await bouncer.with('PostPolicy').execute('view')
    assert.isTrue(canView.authorized)

    const canViewAll = await bouncer.with('PostPolicy').execute('viewAll')
    assert.isFalse(canViewAll.authorized)
  })

  test('check if a user is allowed or denied access', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer(new User(), undefined, {
      PostPolicy: async () => {
        return {
          default: PostPolicy,
        }
      },
    })

    const postsPolicy = bouncer.with('PostPolicy')

    assert.isTrue(await postsPolicy.allows('view'))
    assert.isFalse(await postsPolicy.allows('viewAll'))

    assert.isFalse(await postsPolicy.denies('view'))
    assert.isTrue(await postsPolicy.denies('viewAll'))
  })

  test('authorize for an action', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      resolvePermissions() {}

      view(_: User): AuthorizerResponse {
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        return false
      }
    }

    const bouncer = new Bouncer(new User(), undefined, {
      PostPolicy: async () => {
        return {
          default: PostPolicy,
        }
      },
    })

    const postsPolicy = bouncer.with('PostPolicy')
    await assert.doesNotRejects(() => postsPolicy.authorize('view'))
    await assert.rejects(() => postsPolicy.authorize('viewAll'), 'Access denied')
  })
})

test.group('Bouncer | policies | before hook', () => {
  test('execute action when hook returns undefined or null', async ({ assert }) => {
    let actionsCounter = 0

    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      before() {
        return
      }

      view(_: User): AuthorizerResponse {
        actionsCounter++
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        actionsCounter++
        return false
      }
    }

    const bouncer = new Bouncer(new User())
    const canView = await bouncer.with(PostPolicy).execute('view')
    assert.isTrue(canView.authorized)

    const canViewAll = await bouncer.with(PostPolicy).execute('viewAll')
    assert.isFalse(canViewAll.authorized)

    assert.equal(actionsCounter, 2)
  })

  test('deny access when before hook returns false', async ({ assert }) => {
    let actionsCounter = 0

    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      before() {
        return false
      }

      view(_: User): AuthorizerResponse {
        actionsCounter++
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        actionsCounter++
        return false
      }
    }

    const bouncer = new Bouncer(new User())
    const canView = await bouncer.with(PostPolicy).execute('view')
    assert.isFalse(canView.authorized)

    const canViewAll = await bouncer.with(PostPolicy).execute('viewAll')
    assert.isFalse(canViewAll.authorized)

    assert.equal(actionsCounter, 0)
  })

  test('return custom response from before hook', async ({ assert }) => {
    let actionsCounter = 0

    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      before() {
        return AuthorizationResponse.deny('Post not found', 404)
      }

      view(_: User): AuthorizerResponse {
        actionsCounter++
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        actionsCounter++
        return false
      }
    }

    const bouncer = new Bouncer(new User())
    const canView = await bouncer.with(PostPolicy).execute('view')
    assert.isFalse(canView.authorized)
    assert.equal(canView.message, 'Post not found')
    assert.equal(canView.status, 404)

    const canViewAll = await bouncer.with(PostPolicy).execute('viewAll')
    assert.isFalse(canViewAll.authorized)
    assert.equal(canViewAll.message, 'Post not found')
    assert.equal(canViewAll.status, 404)

    assert.equal(actionsCounter, 0)
  })
})

test.group('Bouncer | policies | after hook', () => {
  test('passthrough action response when hook returns undefined', async ({ assert }) => {
    let actionsCounter = 0

    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      after() {
        return
      }

      view(_: User): AuthorizerResponse {
        actionsCounter++
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        actionsCounter++
        return false
      }
    }

    const bouncer = new Bouncer(new User())
    const canView = await bouncer.with(PostPolicy).execute('view')
    assert.isTrue(canView.authorized)

    const canViewAll = await bouncer.with(PostPolicy).execute('viewAll')
    assert.isFalse(canViewAll.authorized)

    assert.equal(actionsCounter, 2)
  })

  test('overwrite action response from after hook', async ({ assert }) => {
    let actionsCounter = 0

    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      after() {
        return false
      }

      view(_: User): AuthorizerResponse {
        actionsCounter++
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        actionsCounter++
        return false
      }
    }

    const bouncer = new Bouncer(new User())
    const canView = await bouncer.with(PostPolicy).execute('view')
    assert.isFalse(canView.authorized)

    const canViewAll = await bouncer.with(PostPolicy).execute('viewAll')
    assert.isFalse(canViewAll.authorized)

    assert.equal(actionsCounter, 2)
  })

  test('overwrite before hook response from after response', async ({ assert }) => {
    let actionsCounter = 0

    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      before() {
        return AuthorizationResponse.deny('Post not found', 404)
      }

      after() {
        return AuthorizationResponse.allow()
      }

      view(_: User): AuthorizerResponse {
        actionsCounter++
        return true
      }

      viewAll(_: User): AuthorizerResponse {
        actionsCounter++
        return false
      }
    }

    const bouncer = new Bouncer(new User())
    const canView = await bouncer.with(PostPolicy).execute('view')
    assert.isTrue(canView.authorized)

    const canViewAll = await bouncer.with(PostPolicy).execute('viewAll')
    assert.isTrue(canViewAll.authorized)

    assert.equal(actionsCounter, 0)
  })
})
