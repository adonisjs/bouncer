/*
 * @adonisjs/session
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { fileURLToPath } from 'node:url'
import { IgnitorFactory } from '@adonisjs/core/factories'
import Configure from '@adonisjs/core/commands/configure'

import { stubsRoot } from '../index.js'
const BASE_URL = new URL('./tmp/', import.meta.url)

test.group('Configure', (group) => {
  group.each.setup(({ context }) => {
    context.fs.baseUrl = BASE_URL
    context.fs.basePath = fileURLToPath(BASE_URL)
  })

  test('register provider and publish stubs', async ({ fs, assert }) => {
    const ignitor = new IgnitorFactory()
      .withCoreProviders()
      .withCoreConfig()
      .create(BASE_URL, {
        importer: (filePath) => {
          if (filePath.startsWith('./') || filePath.startsWith('../')) {
            return import(new URL(filePath, BASE_URL).href)
          }

          return import(filePath)
        },
      })

    await fs.createJson('tsconfig.json', {})
    await fs.create('start/kernel.ts', `router.use([])`)
    await fs.create('adonisrc.ts', `export default defineConfig({}) {}`)

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    const ace = await app.container.make('ace')
    const command = await ace.create(Configure, ['../../index.js'])
    await command.exec()

    const stubsManager = await app.stubs.create()
    const abilitiesStub = await stubsManager
      .build('abilities.stub', { source: stubsRoot })
      .then((stub) => stub.prepare({}))

    const policiesStub = await stubsManager
      .build('policies.stub', { source: stubsRoot })
      .then((stub) => stub.prepare({}))

    await assert.fileContains('adonisrc.ts', '@adonisjs/bouncer/bouncer_provider')
    await assert.fileContains('app/abilities/main.ts', abilitiesStub.contents)
    await assert.fileContains('app/policies/main.ts', policiesStub.contents)
    await assert.fileContains(
      'app/middleware/initialize_bouncer_middleware.ts',
      `export default class InitializeBouncerMiddleware {`
    )
  }).disableTimeout()
})
