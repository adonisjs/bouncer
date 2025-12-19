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

import { stubsRoot } from '../stubs/main.ts'

/**
 * AdonisJS Ace command for generating bouncer policy classes. This command
 * creates new policy files with optional method stubs.
 *
 * @example
 * ```sh
 * node ace make:policy PostPolicy
 * node ace make:policy UserPolicy view edit delete --model=User
 * node ace make:policy PostPolicy
 * ```
 */
export default class MakePolicy extends BaseCommand {
  /**
   * Command name used to invoke this command
   */
  static commandName = 'make:policy'

  /**
   * Human-readable description of the command
   */
  static description = 'Make a new bouncer policy class'

  /**
   * Command configuration options
   */
  static options: CommandOptions = {
    allowUnknownFlags: true,
  }

  /**
   * The name of the policy file to create
   */
  @args.string({ description: 'Name of the policy file' })
  declare name: string

  /**
   * Optional array of method names to pre-define on the policy class
   */
  @args.spread({ description: 'Method names to pre-define on the policy', required: false })
  declare actions?: string[]

  /**
   * The model name for which to generate the policy
   */
  @flags.string({ description: 'The name of the policy model' })
  declare model?: string

  /**
   * Execute the make:policy command. This method handles the entire
   * policy generation workflow including prompting for registration,
   * creating the policy file from a stub, and optionally registering
   * the policy in the main policies file.
   *
   * @example
   * ```bash
   * # Creates PostPolicy.ts with view, edit, delete methods
   * node ace make:policy PostPolicy view edit delete
   *
   * # Creates UserPolicy.ts without auto-registration
   * node ace make:policy UserPolicy --no-register
   * ```
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
