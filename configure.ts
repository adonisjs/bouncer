/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  const codemods = await command.createCodemods()

  /**
   * Register provider
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@adonisjs/bouncer/bouncer_provider')
  })

  /**
   * Publish and register middleware
   */
  await command.publishStub('initialize_bouncer_middleware.stub', {
    entity: command.app.generators.createEntity('initialize_bouncer'),
  })
  await codemods.registerMiddleware('router', [
    {
      path: '#middleware/initialize_bouncer_middleware',
    },
  ])
}
