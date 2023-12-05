/*
 * @adonisjs/boucner
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { createEmitter } from '../helpers.js'
import { Bouncer } from '../../src/bouncer.js'
import { AuthorizationResponse } from '../../src/response.js'

test.group('Bouncer | actions | types', () => {
  test('assert allowed actions by reference', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    const editPost = Bouncer.define((_: User) => false)
    const editStaff = Bouncer.define((_: Admin) => false)
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
  }).throws(`Invalid bouncer ability "'editStaff'"`)

  test('assert allowed pre-defined actions', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    const editPost = Bouncer.define((_: User) => false)
    const editStaff = Bouncer.define((_: Admin) => false)
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

  test('infer arguments accepted by an action', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Post {
      declare userId: null
      declare title: string
    }

    const editPost = Bouncer.define((_: User, __: Post) => {
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

  test('assert allowed actions by reference with union of users', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    const editPost = Bouncer.define((_: User | Admin) => false)
    const editStaff = Bouncer.define((_: User | Admin) => false)

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
  }).throws(`Invalid bouncer ability "'editStaff'"`)

  test('assert allowed pre-defined actions with union of users', async () => {
    class User {
      declare id: number
      declare email: string
    }
    class Admin {
      declare adminId: number
    }

    const editPost = Bouncer.define((_: User | Admin) => false)
    const editStaff = Bouncer.define((_: User | Admin) => false)
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
})

test.group('Bouncer | actions', () => {
  test('execute action by reference', async ({ assert }, done) => {
    class User {
      declare id: number
      declare email: string
    }

    const emitter = createEmitter()
    const editPost = Bouncer.define((_: User) => false)
    const bouncer = new Bouncer(new User())
    bouncer.setEmitter(emitter)

    emitter.on('authorization:finished', (event) => {
      assert.instanceOf(event.user, User)
      assert.deepEqual(event.parameters, [])
      assert.instanceOf(event.response, AuthorizationResponse)
      done()
    })

    const response = await bouncer.execute(editPost)
    assert.instanceOf(response, AuthorizationResponse)
    assert.equal(response.authorized, false)
  }).waitForDone()

  test('execute action from pre-defined list', async ({ assert }, done) => {
    class User {
      declare id: number
      declare email: string
    }

    const emitter = createEmitter()
    const editPost = Bouncer.define((_: User) => false)
    const bouncer = new Bouncer(new User(), { editPost })
    bouncer.setEmitter(emitter)

    emitter.on('authorization:finished', (event) => {
      assert.instanceOf(event.user, User)
      assert.equal(event.action, 'editPost')
      assert.deepEqual(event.parameters, [])
      assert.instanceOf(event.response, AuthorizationResponse)
      done()
    })

    const response = await bouncer.execute('editPost')
    assert.instanceOf(response, AuthorizationResponse)
    assert.equal(response.authorized, false)
  }).waitForDone()

  test('pass arguments to the action', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }
    class Post {
      constructor(public userId: number) {}
    }

    const editPost = Bouncer.define((user: User, post: Post) => {
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

  test('check if user is allowed or denied to perform an action', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.define((_: User) => false)
    const bouncer = new Bouncer(new User(), { editPost })

    assert.isFalse(await bouncer.allows(editPost))
    assert.isTrue(await bouncer.denies(editPost))

    assert.isFalse(await bouncer.allows('editPost'))
    assert.isTrue(await bouncer.denies('editPost'))
  })

  test('deny access for guest users', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.define((_: User) => {
      throw new Error('Never executed to be invoked for guest users')
    })
    const actions = { editPost }

    const bouncer = new Bouncer<User, typeof actions>(null, actions)

    assert.isFalse(await bouncer.allows(editPost))
    assert.isTrue(await bouncer.denies(editPost))

    assert.isFalse(await bouncer.allows('editPost'))
    assert.isTrue(await bouncer.denies('editPost'))
  })

  test('execute action when guest users are allowed', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.define(
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
})

test.group('Bouncer | actions | userResolver', () => {
  test('execute action by reference', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.define((_: User) => false)
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

    const editPost = Bouncer.define((_: User) => false)
    const bouncer = new Bouncer(() => new User(), { editPost })

    const response = await bouncer.execute('editPost')
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

    const editPost = Bouncer.define((user: User, post: Post) => {
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

  test('check if user is allowed or denied to perform an action', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.define((_: User) => false)
    const bouncer = new Bouncer(() => new User(), { editPost })

    assert.isFalse(await bouncer.allows(editPost))
    assert.isTrue(await bouncer.denies(editPost))

    assert.isFalse(await bouncer.allows('editPost'))
    assert.isTrue(await bouncer.denies('editPost'))
  })

  test('deny access for guest users', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.define((_: User) => {
      throw new Error('Never executed to be invoked for guest users')
    })
    const actions = { editPost }

    const bouncer = new Bouncer<User, typeof actions>(() => null, actions)

    assert.isFalse(await bouncer.allows(editPost))
    assert.isTrue(await bouncer.denies(editPost))

    assert.isFalse(await bouncer.allows('editPost'))
    assert.isTrue(await bouncer.denies('editPost'))
  })

  test('execute action when guest users are allowed', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.define(
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

  test('authorize action by reference', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.define((_: User) => false)
    const bouncer = new Bouncer(() => new User())

    await assert.rejects(() => bouncer.authorize(editPost), 'Access denied')
  })

  test('authorize action from pre-defined list', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.define((_: User) => false)
    const bouncer = new Bouncer(() => new User(), { editPost })

    await assert.rejects(() => bouncer.authorize('editPost'), 'Access denied')
  })
})
