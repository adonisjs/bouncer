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
import MakePolicy from '../../commands/make_policy.ts'

test.group('MakePolicy', () => {
  test('make policy class using the stub', async ({ assert, fs }) => {
    await fs.createJson('tsconfig.json', {})
    await fs.create('app/policies/main.ts', `export const policies = {}`)

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePolicy, ['post'])
    await command.exec()
    command.assertSucceeded()

    command.assertLog('green(DONE:)    create app/policies/post_policy.ts')

    await assert.fileContains('app/policies/post_policy.ts', [
      `import Post from '#models/post'`,
      `import User from '#models/user'`,
      `import { BasePolicy } from '@adonisjs/bouncer'`,
      `import type { AuthorizerResponse } from '@adonisjs/bouncer/types'`,
      `export default class PostPolicy extends BasePolicy`,
    ])
  })

  test('make policy class inside nested directories', async ({ assert, fs }) => {
    await fs.createJson('tsconfig.json', {})
    await fs.create('app/policies/main.ts', `export const policies = {}`)

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePolicy, ['post/published', '--model=post'])
    command.prompt
      .trap('Do you want to register the policy inside the app/policies/main.ts file?')
      .accept()

    await command.exec()
    command.assertSucceeded()

    command.assertLog('green(DONE:)    create app/policies/post/published_policy.ts')
    await assert.fileContains('app/policies/post/published_policy.ts', [
      `import Post from '#models/post'`,
      `import User from '#models/user'`,
      `import { BasePolicy } from '@adonisjs/bouncer'`,
      `import type { AuthorizerResponse } from '@adonisjs/bouncer/types'`,
      `export default class PublishedPolicy extends BasePolicy`,
    ])
  })

  test('define policy with actions', async ({ assert, fs }) => {
    await fs.createJson('tsconfig.json', {})
    await fs.create('app/policies/main.ts', `export const policies = {}`)

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakePolicy, ['post', 'view', 'edit', 'delete'])
    command.prompt
      .trap('Do you want to register the policy inside the app/policies/main.ts file?')
      .accept()

    await command.exec()
    command.assertSucceeded()

    command.assertLog('green(DONE:)    create app/policies/post_policy.ts')
    await assert.fileContains('app/policies/post_policy.ts', [
      `import Post from '#models/post'`,
      `import User from '#models/user'`,
      `view(user: User): AuthorizerResponse`,
      `edit(user: User): AuthorizerResponse`,
      `delete(user: User): AuthorizerResponse`,
    ])
  })
})
