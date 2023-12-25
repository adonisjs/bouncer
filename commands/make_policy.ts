/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@adonisjs/core/helpers/string'
import { extname, relative, basename } from 'node:path'
import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { stubsRoot } from '../stubs/main.js'

export default class MakePolicy extends BaseCommand {
  static commandName = 'make:policy'
  static description = 'Make a new bouncer policy class'
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

  @flags.boolean({
    description: 'Auto register the policy inside the app/policies/main.ts file',
    showNegatedVariantInHelp: true,
    alias: 'r',
  })
  declare register?: boolean

  /**
   * The model for which to generate the policy.
   */
  @flags.string({ description: 'The name of the policy model' })
  declare model?: string

  /**
   * Execute command
   */
  async run(): Promise<void> {
    /**
     * Display prompt to know if we should register the policy
     * file inside the "app/policies/main.ts" file.
     */
    if (this.register === undefined) {
      this.register = await this.prompt.confirm(
        'Do you want to register the policy inside the app/policies/main.ts file?'
      )
    }

    const codemods = await this.createCodemods()
    const { destination } = await codemods.makeUsingStub(stubsRoot, 'make/policy/main.stub', {
      flags: this.parsed.flags,
      actions: this.actions?.map((action) => string.camelCase(action)) || [],
      entity: this.app.generators.createEntity(this.name),
      model: this.app.generators.createEntity(this.model || this.name),
    })

    /**
     * Do not register when prompt has been denied or "--no-register"
     * flag was used
     */
    if (!this.register) {
      return
    }

    /**
     * Creative relative path for the policy file from
     * the "./app/policies" directory
     */
    const policyRelativePath = relative(this.app.policiesPath(), destination).replace(
      extname(destination),
      ''
    )

    /**
     * Convert the policy path to pascalCase. Remember, do not take
     * the basename in this case, because we want scoped policies
     * to be registered with their fully qualified name.
     */
    const name = string.pascalCase(policyRelativePath)

    /**
     * Register policy
     */
    await codemods.registerPolicies([
      {
        name: name,
        path: `#policies/${policyRelativePath}`,
      },
    ])
  }
}
