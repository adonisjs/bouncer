/* @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import { Bouncer } from '../src/Bouncer'

test.group('Actions Authorizer', () => {
	test('return true if a user is allowed to perform an action', async (assert) => {
		class User {
			constructor(public id: number) {}
		}

		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()
		bouncer.define('viewPost', (user: User, post: Post) => {
			return user.id === post.userId
		})

		const authorizer = bouncer.forUser(new User(1))
		assert.isTrue(await authorizer.allows('viewPost', new Post(1)))
	})

	test('return false if a user is not allowed to perform an action', async (assert) => {
		class User {
			constructor(public id: number) {}
		}

		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()
		bouncer.define('viewPost', (user: User, post: Post) => {
			return user.id === post.userId
		})

		const authorizer = bouncer.forUser(new User(1))
		assert.isFalse(await authorizer.allows('viewPost', new Post(2)))
	})

	test('return true if a user is denied to perform an action', async (assert) => {
		class User {
			constructor(public id: number) {}
		}

		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()
		bouncer.define('viewPost', (user: User, post: Post) => {
			return user.id === post.userId
		})

		const authorizer = bouncer.forUser(new User(1))
		assert.isTrue(await authorizer.denies('viewPost', new Post(2)))
	})

	test('return false if a user is not denied to perform an action', async (assert) => {
		class User {
			constructor(public id: number) {}
		}
		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()
		bouncer.define('viewPost', (user: User, post: Post) => {
			return user.id === post.userId
		})

		const authorizer = bouncer.forUser(new User(1))
		assert.isFalse(await authorizer.denies('viewPost', new Post(1)))
	})

	test('raise exception when a user is not allowed to perform an action', async (assert) => {
		assert.plan(2)

		class User {
			constructor(public id: number) {}
		}

		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()
		bouncer.define('viewPost', (user: User, post: Post) => {
			return user.id === post.userId
		})

		const authorizer = bouncer.forUser(new User(1))

		try {
			await authorizer.authorize('viewPost', new Post(2))
		} catch (error) {
			assert.equal(error.message, 'E_AUTHORIZED_ACCESS: Unauthorized Access')
			assert.equal(error.status, 403)
		}
	})

	test('allow custom denial message', async (assert) => {
		assert.plan(2)

		class User {
			constructor(public id: number) {}
		}

		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()

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
			assert.equal(error.message, 'E_AUTHORIZED_ACCESS: Cannot access post')
			assert.equal(error.status, 403)
		}
	})

	test('allow custom denial message with custom status code', async (assert) => {
		assert.plan(2)

		class User {
			constructor(public id: number) {}
		}

		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()

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
			assert.equal(error.message, 'E_AUTHORIZED_ACCESS: Post not found')
			assert.equal(error.status, 404)
		}
	})

	test('allow switching user at runtime', async (assert) => {
		class User {
			constructor(public id: number) {}
		}

		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()

		bouncer.define('viewPost', (user: User, post: Post) => {
			return user.id === post.userId
		})

		const authorizer = bouncer.forUser(new User(1))

		assert.isFalse(await authorizer.allows('viewPost', new Post(2)))
		assert.isTrue(await authorizer.forUser(new User(2)).allows('viewPost', new Post(2)))
	})

	test('authorize action from a before hook', async (assert) => {
		let actionInvocationCounts = 0

		class User {
			constructor(public id: number, public isSuperAdmin: boolean = false) {}
		}

		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()

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

	test('authorize action from an after hook', async (assert) => {
		let actionInvocationCounts = 0

		class User {
			constructor(public id: number, public isSuperAdmin: boolean = false) {}
		}

		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()

		bouncer.after((user: User, _, result) => {
			if (user.isSuperAdmin) {
				assert.deepEqual(result.errorResponse, ['Unauthorized Access', 403])
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

	test('run the action callback when hooks skips the authorization', async (assert) => {
		let hooksInvocationCounts = 0

		class User {
			constructor(public id: number, public isSuperAdmin: boolean = false) {}
		}

		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()

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

	test('do not run the next hook when first one authorizes the action', async (assert) => {
		let hooksInvocationCounts = 0

		class User {
			constructor(public id: number, public isSuperAdmin: boolean = false) {}
		}

		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()

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

	test('do not attempt authorization when user is missing', async (assert) => {
		let actionInvocationCounts = 0

		class User {
			constructor(public id: number) {}
		}

		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()

		bouncer.define('viewPost', (user: User, post: Post) => {
			actionInvocationCounts++
			return user.id === post.userId
		})

		const authorizer = bouncer.forUser(null)

		assert.isFalse(await authorizer.allows('viewPost', new Post(1)))
		assert.equal(actionInvocationCounts, 0)
	})

	test('do attempt authorization when user is missing and guest is allowed', async (assert) => {
		let actionInvocationCounts = 0

		class User {
			constructor(public id: number) {}
		}

		class Post {
			constructor(public userId: number) {}
		}

		const bouncer = new Bouncer()

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
})
