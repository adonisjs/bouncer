/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { TagContract } from '@ioc:Adonis/Core/View'

/**
 * Can tag
 */
export const CanTag: TagContract = {
  tagName: 'can',
  block: true,
  seekable: true,
  compile(parser, buffer, token) {
    const parsed = parser.utils.transformAst(
      parser.utils.generateAST(token.properties.jsArg, token.loc, token.filename),
      token.filename,
      parser
    )

    /**
     * For non sequence expression we have to wrap the args inside parenthesis
     */
    const openingBrace = parsed.type !== 'SequenceExpression' ? '(' : ''
    const closingBrace = parsed.type !== 'SequenceExpression' ? ')' : ''

    /**
     * Write the if statement
     */
    buffer.writeStatement(
      `if (await state.bouncer.can${openingBrace}${parser.utils.stringify(
        parsed
      )}${closingBrace}) {`,
      token.filename,
      token.loc.start.line
    )

    /**
     * Process all children
     */
    token.children.forEach((child) => parser.processToken(child, buffer))

    /**
     * Close if statement
     */
    buffer.writeStatement('}', token.filename, -1)
  },
}

/**
 * Cannot tag
 */
export const CannotTag: TagContract = {
  tagName: 'cannot',
  block: true,
  seekable: true,
  compile(parser, buffer, token) {
    const parsed = parser.utils.transformAst(
      parser.utils.generateAST(token.properties.jsArg, token.loc, token.filename),
      token.filename,
      parser
    )

    /**
     * For non sequence expression we have to wrap the args inside parenthesis
     */
    const openingBrace = parsed.type !== 'SequenceExpression' ? '(' : ''
    const closingBrace = parsed.type !== 'SequenceExpression' ? ')' : ''

    /**
     * Write the if statement
     */
    buffer.writeStatement(
      `if (await state.bouncer.cannot${openingBrace}${parser.utils.stringify(
        parsed
      )}${closingBrace}) {`,
      token.filename,
      token.loc.start.line
    )

    /**
     * Process all children
     */
    token.children.forEach((child) => parser.processToken(child, buffer))

    /**
     * Close if statement
     */
    buffer.writeStatement('}', token.filename, -1)
  },
}
