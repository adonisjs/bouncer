/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'

import { Bouncer } from '../src/bouncer.ts'
import type { BouncerEvents } from '../src/types.ts'

declare module '@adonisjs/core/types' {
  export interface EventsList extends BouncerEvents {}
}

/**
 * AdonisJS service provider for the Bouncer package. This provider handles
 * the registration of Edge template tags and configures the event emitter
 * for authorization events.
 *
 * The provider automatically:
 * - Registers @can and @cannot Edge template tags when Edge.js is available
 * - Configures the Bouncer to use the application's event emitter
 *
 * @example
 * ```js
 * // The provider is automatically registered in AdonisJS
 * // No manual setup required - it runs during application boot
 * ```
 */
export default class BouncerProvider {
  /**
   * Create a new BouncerProvider instance
   *
   * @param app AdonisJS application service instance
   */
  constructor(protected app: ApplicationService) {}

  /**
   * Boot the bouncer provider. This method is called during application
   * startup and handles the registration of Edge plugins and event emitter
   * configuration.
   *
   * @example
   * ```js
   * // Called automatically by AdonisJS during boot process
   * await provider.boot()
   * ```
   */
  async boot() {
    if (this.app.usingEdgeJS) {
      const edge = await import('edge.js')
      const { edgePluginBouncer } = await import('../src/plugins/edge.js')
      edge.default.use(edgePluginBouncer)
    }

    Bouncer.emitter = await this.app.container.make('emitter')
  }
}
