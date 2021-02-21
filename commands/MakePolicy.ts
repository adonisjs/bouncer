/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'path'
import camelcase from 'camelcase'
import { BaseCommand, flags, args } from '@adonisjs/core/build/standalone'

/**
 * Stubs for the policy actions
 */
const ACTIONS_STUBS = (
  userVariable: string,
  userModel: string,
  resourceVariable: string,
  resourceModel: string
) => {
  return {
    viewList: `public async viewList(${userVariable}: ${userModel}) {}`,
    view: `public async view(${userVariable}: ${userModel}, ${resourceVariable}: ${resourceModel}) {}`,
    create: `public async create(${userVariable}: ${userModel}) {}`,
    update: `public async update(${userVariable}: ${userModel}, ${resourceVariable}: ${resourceModel}) {}`,
    delete: `public async delete(${userVariable}: ${userModel}, ${resourceVariable}: ${resourceModel}) {}`,
  }
}

/**
 * Command to create a new policy
 */
export default class MakePolicyCommand extends BaseCommand {
  public static commandName = 'make:policy'
  public static description = 'Make a new bouncer policy'

  /**
   * Name of the policy
   */
  @args.string({ description: 'Name of the policy to create' })
  public name: string

  /**
   * Make of the resource model for authorization
   */
  @flags.string({
    description: 'Name of the resource model to authorize',
    async defaultValue(self) {
      return self.prompt.ask('Enter the name of the resource model to authorize', {
        hint: 'optional',
      })
    },
  })
  public resourceModel: string

  /**
   * Make of the user model to be authorized
   */
  @flags.string({
    description: 'Name of the user model to be authorized',
    async defaultValue(self) {
      return self.prompt.ask('Enter the name of the user model to be authorized', {
        hint: 'optional',
        default: 'User',
      })
    },
  })
  public userModel: string

  /**
   * An optional set of actions to write inside the policy class
   */
  @flags.array({
    description: 'Actions to implement',
  })
  public actions: string[]

  /**
   * Makes the namespace for a given model
   */
  private makeModelNamespace(model: string) {
    const modelsNamespace = this.application.rcFile.namespaces.models
    return `${modelsNamespace}/${model.replace(new RegExp(`^${modelsNamespace}/`), '')}`
  }

  /**
   * Makes the model variable name
   */
  private makeModelVariable(model: string) {
    return camelcase(model)
  }

  /**
   * Run the command
   */
  public async run() {
    /**
     * Prompt for actions when actions are not defined, but resourceModel is
     * defined
     */
    if (this.resourceModel && (!this.actions || !this.actions.length)) {
      this.actions = await this.prompt.multiple('Select the actions you want to authorize', [
        'None',
        'viewList',
        'view',
        'create',
        'update',
        'delete',
      ])
    }

    /**
     * Create actions when one or more actions are selected and "None" is not
     * selected
     */
    const createActions = this.actions && this.actions.length && !this.actions.includes('None')

    /**
     * Actions stubs
     */
    const actionsStubs = createActions
      ? ACTIONS_STUBS(
          this.makeModelVariable(this.userModel),
          this.userModel,
          this.makeModelVariable(this.resourceModel),
          this.resourceModel
        )
      : {}

    /**
     * Policy import
     */
    const imports = createActions
      ? [
          `import ${this.userModel} from '${this.makeModelNamespace(this.userModel)}'`,
          `import ${this.resourceModel} from '${this.makeModelNamespace(this.resourceModel)}'`,
        ]
      : []

    const stub = join(__dirname, '..', 'templates', 'policy.txt')
    const path = this.application.resolveNamespaceDirectory('policies')
    const policiesNamespace = this.application.rcFile.namespaces.policies || 'App/Policies'

    const file = this.generator
      .addFile(this.name, { pattern: 'pascalcase', suffix: 'Policy' })
      .stub(stub)
      .destinationDir(path || 'app/Policies')
      .useMustache()
      .apply({
        actions: createActions
          ? this.actions.reduce((result, action) => {
              if (actionsStubs[action]) {
                result = result.concat(actionsStubs[action])
              }
              return result
            }, [])
          : [],
        imports,
      })
      .appRoot(this.application.cliCwd || this.application.appRoot)
      .toJSON()

    await this.generator.run()

    if (file.state === 'persisted') {
      this.ui
        .instructions()
        .heading('Register Policy')
        .add(`Open ${this.colors.cyan('start/bouncer.ts')} file`)
        .add(`Navigate to ${this.colors.cyan('bouncer.registerPolicies')} function call`)
        .add(
          `Add ${this.colors
            .cyan()
            .underline(
              `${file.filename}: () => import('${policiesNamespace}/${file.filename}')`
            )} to the object`
        )
        .render()
    }
  }
}
