/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationService } from '@adonisjs/core/types'

import { Bouncer } from '../src/bouncer.js'
import type { AuthorizationEvents } from '../src/types.js'

declare module '@adonisjs/core/types' {
  export interface EventsList extends AuthorizationEvents {}
}

/**
 * Register edge tags and shares the app emitter with Bouncer
 */
export default class BouncerProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    if (this.app.usingEdgeJS) {
      const edge = await import('edge.js')
      const { edgePluginBouncer } = await import('../src/plugins/edge.js')
      edge.default.use(edgePluginBouncer)
    }

    Bouncer.emitter = await this.app.container.make('emitter')
  }
}
