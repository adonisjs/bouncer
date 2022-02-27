/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import dedent from 'ts-dedent'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { Bouncer } from '../src/Bouncer'
import { setup, fs } from '../test-helpers'
import { CanTag } from '../src/Bindings/View'

let app: ApplicationContract

test.group('Can Tag', (group) => {
  group.each.setup(async () => {
    app = await setup(true)
    app.container.resolveBinding('Adonis/Core/View').registerTag(CanTag)
  })

  group.each.teardown(async () => {
    await fs.cleanup()
  })

  test('use "can tag" with action name', async ({ assert }) => {
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
    app.container.resolveBinding('Adonis/Core/View').registerTemplate('eval', {
      template: dedent`
			@can('viewPost', post)
				The post user id is {{ post.userId }}
			@end
			`,
    })

    const view = app.container.resolveBinding('Adonis/Core/View')
    const output = await view.render('eval', { bouncer: authorizer, post: new Post(1) })
    assert.equal(output.trim(), 'The post user id is 1')
  })

  test('use "can tag" without action arguments', async ({ assert }) => {
    class User {
      constructor(public id: number) {}
    }

    const bouncer = new Bouncer(app)
    bouncer.define('createPost', (_) => {
      return true
    })

    const authorizer = bouncer.forUser(new User(1))
    app.container.resolveBinding('Adonis/Core/View').registerTemplate('eval', {
      template: dedent`
			@can('createPost')
				<a> Create post </a>
			@end
			`,
    })

    const view = app.container.resolveBinding('Adonis/Core/View')
    const output = await view.render('eval', { bouncer: authorizer })
    assert.equal(output.trim(), '<a> Create post </a>')
  })

  test('use "can tag" with a literal value', async ({ assert }) => {
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
    bouncer.define('createPost', (_) => {
      return true
    })

    const authorizer = bouncer.forUser(new User(1))
    app.container.resolveBinding('Adonis/Core/View').registerTemplate('eval', {
      template: dedent`
			@set('action', 'createPost')
			@set('action2', 'viewPost')
			@can(action)
				<a> Create post </a>
			@end

			@can(action2, post)
				<a> View post </a>
			@end
			`,
    })

    const view = app.container.resolveBinding('Adonis/Core/View')

    const output = await view.render('eval', { bouncer: authorizer, post: new Post(1) })
    assert.deepEqual(
      output.split('\n').map((line) => line.trim()),
      ['<a> Create post </a>', '', '<a> View post </a>']
    )
  })

  test('use "can tag" as a member expression', async ({ assert }) => {
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
    bouncer.define('createPost', (_) => {
      return true
    })

    const authorizer = bouncer.forUser(new User(1))
    app.container.resolveBinding('Adonis/Core/View').registerTemplate('eval', {
      template: dedent`
			@set('actions', { view: 'viewPost', create: 'createPost' })
			@can(actions.create)
				<a> Create post </a>
			@end

			@can(actions.view, post)
				<a> View post </a>
			@end
			`,
    })

    const view = app.container.resolveBinding('Adonis/Core/View')

    const output = await view.render('eval', { bouncer: authorizer, post: new Post(1) })
    assert.deepEqual(
      output.split('\n').map((line) => line.trim()),
      ['<a> Create post </a>', '', '<a> View post </a>']
    )
  })

  test('use "can tag" as template literal', async ({ assert }) => {
    class User {
      constructor(public id: number) {}
    }

    class Post {
      constructor(public userId: number) {}
    }

    const bouncer = new Bouncer(app)
    class PostPolicy extends bouncer.BasePolicy {
      public viewPost(user: User, post: Post) {
        return user.id === post.userId
      }

      public createPost() {
        return true
      }
    }

    PostPolicy.boot()
    bouncer.registerPolicies({
      PostPolicy: async () => {
        return { default: PostPolicy }
      },
    })

    const authorizer = bouncer.forUser(new User(1))
    app.container.resolveBinding('Adonis/Core/View').registerTemplate('eval', {
      template: [
        `@set('actions', { view: 'viewPost', create: 'createPost' })`,
        '@can(`PostPolicy.${actions.view}`, post)',
        '	<a> Create post </a>',
        '@end',
        '',
        '@can(`PostPolicy.${actions.create}`)',
        '<a> View post </a>',
        '@end',
      ].join('\n'),
    })

    const view = app.container.resolveBinding('Adonis/Core/View')
    const output = await view.render('eval', { bouncer: authorizer, post: new Post(1) })
    assert.deepEqual(
      output.split('\n').map((line) => line.trim()),
      ['<a> Create post </a>', '', '<a> View post </a>']
    )
  })
})
