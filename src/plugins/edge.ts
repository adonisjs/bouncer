/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { PluginFn } from 'edge.js/types'
import debug from '../debug.js'

/**
 * The edge plugin for Bouncer to perform authorization checks
 * within templates.
 */
export const edgePluginBouncer: PluginFn<undefined> = (edge) => {
  debug('registering bouncer tags with edge')

  edge.registerTag({
    tagName: 'can',
    seekable: true,
    block: true,
    compile(parser, buffer, token) {
      const expression = parser.utils.transformAst(
        parser.utils.generateAST(token.properties.jsArg, token.loc, token.filename),
        token.filename,
        parser
      )

      const openingBrace = expression.type !== 'SequenceExpression' ? '(' : ''
      const closingBrace = expression.type !== 'SequenceExpression' ? ')' : ''
      const parameters = parser.utils.stringify(expression)
      const methodCall = `can${openingBrace}${parameters}${closingBrace}`

      /**
       * Write an if statement
       */
      buffer.writeStatement(
        `if (await state.bouncer.${methodCall}) {`,
        token.filename,
        token.loc.start.line
      )

      /**
       * Process component children using the parser
       */
      token.children.forEach((child) => {
        parser.processToken(child, buffer)
      })

      /**
       * Close if statement
       */
      buffer.writeStatement(`}`, token.filename, token.loc.start.line)
    },
  })

  edge.registerTag({
    tagName: 'cannot',
    seekable: true,
    block: true,
    compile(parser, buffer, token) {
      const expression = parser.utils.transformAst(
        parser.utils.generateAST(token.properties.jsArg, token.loc, token.filename),
        token.filename,
        parser
      )

      const openingBrace = expression.type !== 'SequenceExpression' ? '(' : ''
      const closingBrace = expression.type !== 'SequenceExpression' ? ')' : ''
      const parameters = parser.utils.stringify(expression)
      const methodCall = `cannot${openingBrace}${parameters}${closingBrace}`

      /**
       * Write an if statement
       */
      buffer.writeStatement(
        `if (await state.bouncer.${methodCall}) {`,
        token.filename,
        token.loc.start.line
      )

      /**
       * Process component children using the parser
       */
      token.children.forEach((child) => {
        parser.processToken(child, buffer)
      })

      /**
       * Close if statement
       */
      buffer.writeStatement(`}`, token.filename, token.loc.start.line)
    },
  })
}
