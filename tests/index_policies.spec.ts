/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Kernel } from '@adonisjs/core/ace'
import stringHelpers from '@adonisjs/core/helpers/string'
import { IndexGenerator } from '@adonisjs/assembler/index_generator'
import { indexPolicies } from '../src/assembler_hooks/index_policies.ts'

test.group('Index policies', () => {
  test('generate policies index', async ({ assert, fs }) => {
    const cliUi = Kernel.create().ui
    cliUi.switchMode('raw')

    await fs.create('app/policies/post_policy.ts', '')
    await fs.create('app/policies/post/published_policy.ts', '')

    const generator = new IndexGenerator(stringHelpers.toUnixSlash(fs.basePath), cliUi.logger)
    const indexer = indexPolicies()

    indexer.run({} as any, {} as any, generator)
    await generator.generate()

    await assert.fileExists('.adonisjs/server/policies.ts')
    await assert.fileContains('.adonisjs/server/policies.ts', [
      `export const policies = {`,
      `PostPolicy: () => import('#policies/post_policy')`,
      `PostPublishedPolicy: () => import('#policies/post/published_policy')`,
    ])
    assert.isDefined(
      cliUi.logger.getLogs().find(({ message }) => message.includes('codegen: created 1 file(s)'))
    )
  })

  test('generate policies index inside a DDD project', async ({ assert, fs }) => {
    const cliUi = Kernel.create().ui
    cliUi.switchMode('raw')

    await fs.create('app/posts/policies/post_policy.ts', '')
    await fs.create('app/users/policies/user_policy.ts', '')

    const generator = new IndexGenerator(stringHelpers.toUnixSlash(fs.basePath), cliUi.logger)
    const indexer = indexPolicies({
      source: 'app',
      importAlias: '#app',
      glob: ['**/policies/**/*.ts'],
    })

    indexer.run({} as any, {} as any, generator)
    await generator.generate()

    await assert.fileExists('.adonisjs/server/policies.ts')
    await assert.fileContains('.adonisjs/server/policies.ts', [
      `export const policies = {`,
      `PostPolicy: () => import('#app/posts/policies/post_policy')`,
      `UserPolicy: () => import('#app/users/policies/user_policy')`,
    ])
    assert.isDefined(
      cliUi.logger.getLogs().find(({ message }) => message.includes('codegen: created 1 file(s)'))
    )
  })
})
