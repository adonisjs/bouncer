/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure'
import { stubsRoot } from './stubs/main.js'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  const codemods = await command.createCodemods()

  /**
   * Publish stubs to define abilities and collect
   * policies
   */
  await codemods.makeUsingStub(stubsRoot, 'abilities.stub', {})
  await codemods.makeUsingStub(stubsRoot, 'policies.stub', {})

  /**
   * Register provider
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@adonisjs/bouncer/bouncer_provider')
  })

  /**
   * Publish and register middleware
   */
  await codemods.makeUsingStub(stubsRoot, 'initialize_bouncer_middleware.stub', {
    entity: command.app.generators.createEntity('initialize_bouncer'),
  })
  await codemods.registerMiddleware('router', [
    {
      path: '#middleware/initialize_bouncer_middleware',
    },
  ])
}
