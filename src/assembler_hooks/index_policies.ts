/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type CommonHooks } from '@adonisjs/assembler/types'
import stringHelpers from '@adonisjs/core/helpers/string'

export function indexPolicies(config?: {
  /** Source directory for policies */
  source?: string
  /** Import alias for policies */
  importAlias?: string
  /** Glob patterns for matching policies files */
  glob?: string[]
}): Extract<CommonHooks['init'][number], { run: any }> {
  const policies = Object.assign(
    {
      source: 'app/policies',
      importAlias: '#policies',
      withSharedProps: false,
      output: '.adonisjs/server/policies.ts',
    },
    config
  )

  return {
    run(_, __, indexGenerator) {
      indexGenerator.add('policies', {
        source: policies.source,
        glob: policies.glob,
        importAlias: policies.importAlias,
        output: policies.output,
        as(vfs, buffer, ___, helpers) {
          buffer.write('export const policies = {').indent()

          const policiesFilesList = vfs.asList()
          Object.keys(policiesFilesList).forEach((key) => {
            /**
             * Policy name segments without the policy suffix.
             */
            const policyNameSegments = stringHelpers
              .create(key)
              .removeSuffix('policy')
              .toString()
              .split('/')
              .filter((segment) => segment !== 'policies')

            const policyName = policyNameSegments[policyNameSegments.length - 1]
            const parentDir = policyNameSegments[policyNameSegments.length - 2]

            /**
             * When the policy name and its parent folder has the same name,
             * we skip the parent name from the output key.
             */
            if (
              parentDir &&
              (parentDir === policyName || stringHelpers.plural(policyName) === parentDir)
            ) {
              policyNameSegments.splice(-2, 1)
            }

            policyNameSegments.push('policy')
            buffer.write(
              `${stringHelpers.pascalCase(policyNameSegments.join('/'))}: () => import('${helpers.toImportPath(policiesFilesList[key])}'),`
            )
          })
          buffer.dedent().writeLine('}')
        },
      })
    },
  }
}
