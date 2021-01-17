/*
 * @adonisjs/assembler
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import { join } from 'path'
import importFresh from 'import-fresh'
import { Kernel } from '@adonisjs/ace'
import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/application'

import MakePolicy from '../commands/MakePolicy'

const fs = new Filesystem(join(__dirname, '__app'))

test.group('Make Policy', (group) => {
	group.before(() => {
		process.env.ADONIS_ACE_CWD = fs.basePath
	})

	group.after(() => {
		delete process.env.ADONIS_ACE_CWD
	})

	group.afterEach(async () => {
		await fs.cleanup()
	})

	test('make a policy inside the default directory', async (assert) => {
		await fs.add('.adonisrc.json', JSON.stringify({}))

		const rcContents = importFresh(join(fs.basePath, '.adonisrc.json')) as any
		const app = new Application(fs.basePath, 'test', rcContents)

		const policy = new MakePolicy(app, new Kernel(app))
		policy.name = 'post'
		await policy.run()

		const PostPolicy = await fs.get('app/Policies/PostPolicy.ts')

		assert.deepEqual(PostPolicy.split('\n'), [
			`import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer'`,
			'',
			'export default PostPolicy extends BasePolicy {',
			'}',
			'',
		])
	})

	test('make a policy with actions', async (assert) => {
		await fs.add('.adonisrc.json', JSON.stringify({}))

		const rcContents = importFresh(join(fs.basePath, '.adonisrc.json')) as any
		const app = new Application(fs.basePath, 'test', rcContents)

		const policy = new MakePolicy(app, new Kernel(app))
		policy.name = 'post'
		policy.resourceModel = 'Post'
		policy.userModel = 'User'
		policy.actions = ['create', 'update']

		await policy.run()

		const PostPolicy = await fs.get('app/Policies/PostPolicy.ts')

		assert.deepEqual(PostPolicy.split('\n'), [
			`import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer'`,
			`import User from 'App/Models/User'`,
			`import Post from 'App/Models/Post'`,
			'',
			'export default PostPolicy extends BasePolicy {',
			'	public async create(user: User) {}',
			'	public async update(user: User, post: Post) {}',
			'}',
			'',
		])
	})

	test('do not add actions when none option is selected', async (assert) => {
		await fs.add('.adonisrc.json', JSON.stringify({}))

		const rcContents = importFresh(join(fs.basePath, '.adonisrc.json')) as any
		const app = new Application(fs.basePath, 'test', rcContents)

		const policy = new MakePolicy(app, new Kernel(app))
		policy.name = 'post'
		policy.resourceModel = 'Post'
		policy.userModel = 'User'
		policy.actions = ['create', 'update', 'None']

		await policy.run()

		const PostPolicy = await fs.get('app/Policies/PostPolicy.ts')

		assert.deepEqual(PostPolicy.split('\n'), [
			`import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer'`,
			'',
			'export default PostPolicy extends BasePolicy {',
			'}',
			'',
		])
	})

	test('ignore non-whitelisted actions', async (assert) => {
		await fs.add('.adonisrc.json', JSON.stringify({}))

		const rcContents = importFresh(join(fs.basePath, '.adonisrc.json')) as any
		const app = new Application(fs.basePath, 'test', rcContents)

		const policy = new MakePolicy(app, new Kernel(app))
		policy.name = 'post'
		policy.resourceModel = 'Post'
		policy.userModel = 'User'
		policy.actions = ['create', 'update', 'foo', 'bar']

		await policy.run()

		const PostPolicy = await fs.get('app/Policies/PostPolicy.ts')

		assert.deepEqual(PostPolicy.split('\n'), [
			`import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer'`,
			`import User from 'App/Models/User'`,
			`import Post from 'App/Models/Post'`,
			'',
			'export default PostPolicy extends BasePolicy {',
			'	public async create(user: User) {}',
			'	public async update(user: User, post: Post) {}',
			'}',
			'',
		])
	})

	test('make policy inside a custom directory', async (assert) => {
		await fs.add(
			'.adonisrc.json',
			JSON.stringify({
				namespaces: {
					policies: 'App/Domains/Cart/Policies',
				},
				aliases: {
					App: './app',
				},
			})
		)

		const rcContents = importFresh(join(fs.basePath, '.adonisrc.json')) as any
		const app = new Application(fs.basePath, 'test', rcContents)

		const policy = new MakePolicy(app, new Kernel(app))
		policy.name = 'post'
		policy.resourceModel = 'Post'
		policy.userModel = 'User'
		policy.actions = ['create', 'update', 'foo', 'bar']

		await policy.run()

		const PostPolicy = await fs.get('app/Domains/Cart/Policies/PostPolicy.ts')

		assert.deepEqual(PostPolicy.split('\n'), [
			`import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer'`,
			`import User from 'App/Models/User'`,
			`import Post from 'App/Models/Post'`,
			'',
			'export default PostPolicy extends BasePolicy {',
			'	public async create(user: User) {}',
			'	public async update(user: User, post: Post) {}',
			'}',
			'',
		])
	})

	test('make correct path to custom models namespace', async (assert) => {
		await fs.add(
			'.adonisrc.json',
			JSON.stringify({
				namespaces: {
					models: 'App/Domains/Models',
				},
				aliases: {
					App: './app',
				},
			})
		)

		const rcContents = importFresh(join(fs.basePath, '.adonisrc.json')) as any
		const app = new Application(fs.basePath, 'test', rcContents)

		const policy = new MakePolicy(app, new Kernel(app))
		policy.name = 'post'
		policy.resourceModel = 'Post'
		policy.userModel = 'User'
		policy.actions = ['create', 'update', 'foo', 'bar']

		await policy.run()

		const PostPolicy = await fs.get('app/Policies/PostPolicy.ts')

		assert.deepEqual(PostPolicy.split('\n'), [
			`import { BasePolicy } from '@ioc:Adonis/Addons/Bouncer'`,
			`import User from 'App/Domains/Models/User'`,
			`import Post from 'App/Domains/Models/Post'`,
			'',
			'export default PostPolicy extends BasePolicy {',
			'	public async create(user: User) {}',
			'	public async update(user: User, post: Post) {}',
			'}',
			'',
		])
	})
})
