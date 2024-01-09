/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { AuthorizerResponse } from '../src/types.js'
import { Bouncer } from '../src/bouncer.js'

test.group('AbilitiesBuilder', () => {
  test('define abilities using abilities builder', ({ assert, expectTypeOf }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }
    class Post {
      constructor(public userId: number) {}
    }

    const { abilities } = Bouncer.define('editPost', (user: User, post: Post) => {
      return user.id === post.userId
    })
      .define('deletePost', (user: User, post: Post) => {
        return user.id === post.userId
      })
      .define('createPost', () => {
        return true
      })

    assert.properties(abilities, ['editPost', 'deletePost', 'createPost'])
    expectTypeOf(abilities).toEqualTypeOf<
      {
        editPost: {
          allowGuest: false
          original: (user: User, post: Post) => boolean
          execute(user: User | null, post: Post): AuthorizerResponse
        }
      } & {
        deletePost: {
          allowGuest: false
          original: (user: User, post: Post) => boolean
          execute(user: User | null, post: Post): AuthorizerResponse
        }
      } & {
        createPost: {
          allowGuest: false
          original: () => true
          execute(user: unknown): AuthorizerResponse
        }
      }
    >()
  })

  test('authorize using abilities created using the abilities builder', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }
    class Post {
      constructor(public userId: number) {}
    }

    const { abilities } = Bouncer.define('editPost', (user: User, post: Post) => {
      return user.id === post.userId
    })
      .define('deletePost', (user: User, post: Post) => {
        return user.id === post.userId
      })
      .define('createPost', () => {
        return true
      })

    const bouncer = new Bouncer(new User(1))
    assert.isTrue(await bouncer.allows(abilities.createPost))
    assert.isTrue(await bouncer.allows(abilities.editPost, new Post(1)))
    assert.isTrue(await bouncer.allows(abilities.deletePost, new Post(1)))

    assert.isTrue(await bouncer.denies(abilities.editPost, new Post(2)))
    assert.isTrue(await bouncer.denies(abilities.deletePost, new Post(2)))
  })

  test('authorize by pre-registering builder abilites', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }
    class Post {
      constructor(public userId: number) {}
    }

    const { abilities } = Bouncer.define('editPost', (user: User, post: Post) => {
      return user.id === post.userId
    })
      .define('deletePost', (user: User, post: Post) => {
        return user.id === post.userId
      })
      .define('createPost', () => {
        return true
      })

    const bouncer = new Bouncer(new User(1), abilities)
    assert.isTrue(await bouncer.allows('createPost'))
    assert.isTrue(await bouncer.allows('editPost', new Post(1)))
    assert.isTrue(await bouncer.allows('deletePost', new Post(1)))

    assert.isTrue(await bouncer.denies('editPost', new Post(2)))
    assert.isTrue(await bouncer.denies('deletePost', new Post(2)))
  })
})
