/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@adonisjs/core/helpers/string'
import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { stubsRoot } from '../stubs/main.js'

export default class MakePolicy extends BaseCommand {
  static commandName = 'make:policy'
  static description = 'Make a new policy class'
  static options: CommandOptions = {
    allowUnknownFlags: true,
  }

  /**
   * The name of the policy file
   */
  @args.string({ description: 'Name of the policy file' })
  declare name: string

  @args.spread({ description: 'Method names to pre-define on the policy', required: false })
  declare actions?: string[]

  /**
   * The model for which to generate the policy.
   */
  @flags.string({ description: 'The name of the policy model' })
  declare model?: string

  /**
   * Execute command
   */
  async run(): Promise<void> {
    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, 'make/policy/main.stub', {
      flags: this.parsed.flags,
      actions: this.actions?.map((action) => string.camelCase(action)) || [],
      entity: this.app.generators.createEntity(this.name),
      model: this.app.generators.createEntity(this.model || this.name),
    })
  }
}
