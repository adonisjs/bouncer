/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Edge } from 'edge.js'
import { test } from '@japa/runner'
import { Bouncer } from '../../src/bouncer.js'
import { edgePluginBouncer } from '../../src/plugins/edge.js'
import { BasePolicy } from '../../src/base_policy.js'

test.group('Edge plugin | compile', (group) => {
  group.tap((t) =>
    t.skip(process.platform === 'win32', 'Skipping on windows because of newline breaks')
  )

  test('assert @can tag compiled output', async ({ assert }) => {
    const edge = new Edge()
    edge.use(edgePluginBouncer)
    edge.createRenderer()

    const output = edge.asyncCompiler.compileRaw(
      `@can('editPost', post)
        Can edit post
      @else
        Cannot edit post
      @end
    `
    )

    assert.deepEqual(output.toString().split('\n'), [
      `async function anonymous(template,state,$context`,
      `) {`,
      `let out = "";`,
      `let $lineNumber = 1;`,
      `let $filename = "eval.edge";`,
      `try {`,
      `if (await state.bouncer.can('editPost', state.post)) {`,
      `out += "\\n";`,
      `out += "        Can edit post";`,
      `} else {`,
      `out += "\\n";`,
      `out += "        Cannot edit post";`,
      `}`,
      `out += "\\n";`,
      `out += "    ";`,
      `} catch (error) {`,
      `template.reThrow(error, $filename, $lineNumber);`,
      `}`,
      `return out;`,
      `}`,
    ])
  })

  test('assert @cannot tag compiled output', async ({ assert }) => {
    const edge = new Edge()
    edge.use(edgePluginBouncer)
    edge.createRenderer()

    const output = edge.asyncCompiler.compileRaw(
      `@cannot('editPost', post)
        Cannot edit post
      @end
    `
    )

    assert.deepEqual(output.toString().split('\n'), [
      `async function anonymous(template,state,$context`,
      `) {`,
      `let out = "";`,
      `let $lineNumber = 1;`,
      `let $filename = "eval.edge";`,
      `try {`,
      `if (await state.bouncer.cannot('editPost', state.post)) {`,
      `out += "\\n";`,
      `out += "        Cannot edit post";`,
      `}`,
      `out += "\\n";`,
      `out += "    ";`,
      `} catch (error) {`,
      `template.reThrow(error, $filename, $lineNumber);`,
      `}`,
      `return out;`,
      `}`,
    ])
  })
})

test.group('Edge plugin | abilities', () => {
  test('use @can tag to authorize', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.ability((_: User) => false)
    const bouncer = new Bouncer(new User(), { editPost })

    const edge = new Edge()
    edge.use(edgePluginBouncer)

    const text = await edge.share(bouncer.edgeHelpers).renderRaw(`
    @can('editPost')
      Can edit post
    @else
      Cannot edit post
    @end
    `)

    assert.equal(text.trim(), 'Cannot edit post')
  })

  test('use @cannot tag to authorize', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    const editPost = Bouncer.ability((_: User) => false)
    const bouncer = new Bouncer(new User(), { editPost })

    const edge = new Edge()
    edge.use(edgePluginBouncer)

    const text = await edge.share(bouncer.edgeHelpers).renderRaw(`
    @cannot('editPost')
      Cannot edit post
    @else
      Can edit post
    @end
    `)

    assert.equal(text.trim(), 'Cannot edit post')
  })

  test('pass additional params via @can tag', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const editPost = Bouncer.ability((user: User, post: Post) => user.id === post.userId)
    const bouncer = new Bouncer(new User(1), { editPost })

    const edge = new Edge()
    edge.use(edgePluginBouncer)

    const text = await edge.share(bouncer.edgeHelpers).renderRaw(
      `
    @can('editPost', posts[0])
      Can edit post 1
    @end
    @can('editPost', posts[1])
      Can edit post 2
    @end
    `,
      {
        posts: [new Post(1), new Post(2)],
      }
    )

    assert.equal(text.trim(), 'Can edit post 1')
  })

  test('pass additional params via @cannot tag', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const editPost = Bouncer.ability((user: User, post: Post) => user.id === post.userId)
    const bouncer = new Bouncer(new User(1), { editPost })

    const edge = new Edge()
    edge.use(edgePluginBouncer)

    const text = await edge.share(bouncer.edgeHelpers).renderRaw(
      `
    @cannot('editPost', posts[0])
      Cannot edit post 1
    @end
    @cannot('editPost', posts[1])
      Cannot edit post 2
    @end
    `,
      {
        posts: [new Post(1), new Post(2)],
      }
    )

    assert.equal(text.trim(), 'Cannot edit post 2')
  })
})

test.group('Edge plugin | policies', () => {
  test('use @can tag to authorize', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      edit(_: User) {
        return false
      }
    }

    const bouncer = new Bouncer(
      new User(),
      {},
      {
        PostPolicy: async () => {
          return {
            default: PostPolicy,
          }
        },
      }
    )

    const edge = new Edge()
    edge.use(edgePluginBouncer)

    const text = await edge.share(bouncer.edgeHelpers).renderRaw(`
    @can('PostPolicy.edit')
      Can edit post
    @else
      Cannot edit post
    @end
    `)

    assert.equal(text.trim(), 'Cannot edit post')
  })

  test('use @cannot tag to authorize', async ({ assert }) => {
    class User {
      declare id: number
      declare email: string
    }

    class PostPolicy extends BasePolicy {
      edit(_: User) {
        return false
      }
    }

    const bouncer = new Bouncer(
      new User(),
      {},
      {
        PostPolicy: async () => {
          return {
            default: PostPolicy,
          }
        },
      }
    )

    const edge = new Edge()
    edge.use(edgePluginBouncer)

    const text = await edge.share(bouncer.edgeHelpers).renderRaw(`
    @cannot('PostPolicy.edit')
      Cannot edit post
    @else
      Can edit post
    @end
    `)

    assert.equal(text.trim(), 'Cannot edit post')
  })

  test('pass additional params via @can tag', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class PostPolicy extends BasePolicy {
      edit(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    const bouncer = new Bouncer(
      new User(1),
      {},
      {
        PostPolicy: async () => {
          return {
            default: PostPolicy,
          }
        },
      }
    )

    const edge = new Edge()
    edge.use(edgePluginBouncer)

    const text = await edge.share(bouncer.edgeHelpers).renderRaw(
      `
    @can('PostPolicy.edit', posts[0])
      Can edit post 1
    @end
    @can('PostPolicy.edit', posts[1])
      Can edit post 2
    @end
    `,
      {
        posts: [new Post(1), new Post(2)],
      }
    )

    assert.equal(text.trim(), 'Can edit post 1')
  })

  test('pass additional params via @cannot tag', async ({ assert }) => {
    class User {
      declare email: string
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    class PostPolicy extends BasePolicy {
      edit(user: User, post: Post) {
        return user.id === post.userId
      }
    }

    const bouncer = new Bouncer(
      new User(1),
      {},
      {
        PostPolicy: async () => {
          return {
            default: PostPolicy,
          }
        },
      }
    )

    const edge = new Edge()
    edge.use(edgePluginBouncer)

    const text = await edge.share(bouncer.edgeHelpers).renderRaw(
      `
    @cannot('PostPolicy.edit', posts[0])
      Cannot edit post 1
    @end
    @cannot('PostPolicy.edit', posts[1])
      Cannot edit post 2
    @end
    `,
      {
        posts: [new Post(1), new Post(2)],
      }
    )

    assert.equal(text.trim(), 'Cannot edit post 2')
  })
})
