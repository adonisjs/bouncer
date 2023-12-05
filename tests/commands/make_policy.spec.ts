/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { AceFactory } from '@adonisjs/core/factories'
import MakePolicy from '../../commands/make_policy.js'

test.group('MakePolicy', () => {
  test('make policy class using the stub', async ({ assert, fs }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePolicy, ['post'])
    await command.exec()

    command.assertLog('green(DONE:)    create app/policies/post_policy.ts')
    await assert.fileContains('app/policies/post_policy.ts', `import Post from '#models/post'`)
    await assert.fileContains('app/policies/post_policy.ts', `import User from '#models/user'`)
    await assert.fileContains(
      'app/policies/post_policy.ts',
      `import { BasePolicy } from '@adonisjs/bouncer'`
    )
    await assert.fileContains(
      'app/policies/post_policy.ts',
      `import { AuthorizerResponse } from '@adonisjs/bouncer/types'`
    )
    await assert.fileContains(
      'app/policies/post_policy.ts',
      `export default class PostPolicy extends BasePolicy`
    )
  })

  test('make policy class inside nested directories', async ({ assert, fs }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePolicy, ['post/published', '--model=post'])
    await command.exec()

    command.assertLog('green(DONE:)    create app/policies/post/published_policy.ts')
    await assert.fileContains(
      'app/policies/post/published_policy.ts',
      `import Post from '#models/post'`
    )
    await assert.fileContains(
      'app/policies/post/published_policy.ts',
      `import User from '#models/user'`
    )
    await assert.fileContains(
      'app/policies/post/published_policy.ts',
      `import { BasePolicy } from '@adonisjs/bouncer'`
    )
    await assert.fileContains(
      'app/policies/post/published_policy.ts',
      `import { AuthorizerResponse } from '@adonisjs/bouncer/types'`
    )
    await assert.fileContains(
      'app/policies/post/published_policy.ts',
      `export default class PublishedPolicy extends BasePolicy`
    )
  })

  test('define policy actions', async ({ assert, fs }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePolicy, ['post', 'view', 'edit', 'delete'])
    await command.exec()

    command.assertLog('green(DONE:)    create app/policies/post_policy.ts')
    await assert.fileContains('app/policies/post_policy.ts', `import Post from '#models/post'`)
    await assert.fileContains('app/policies/post_policy.ts', `import User from '#models/user'`)
    await assert.fileContains('app/policies/post_policy.ts', `view(user: User): AuthorizerResponse`)
    await assert.fileContains('app/policies/post_policy.ts', `edit(user: User): AuthorizerResponse`)
    await assert.fileContains(
      'app/policies/post_policy.ts',
      `delete(user: User): AuthorizerResponse`
    )
  })
})
