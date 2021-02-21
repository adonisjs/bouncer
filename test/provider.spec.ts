/*
 * @adonisjs/bouncer
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import { Bouncer } from '../src/Bouncer'
import { setup, fs } from '../test-helpers'
import { ActionsAuthorizer } from '../src/ActionsAuthorizer'

test.group('Setup provider', (group) => {
  group.afterEach(async () => {
    await fs.cleanup()
  })

  test('register provider', async (assert) => {
    const app = await setup(true)
    assert.isTrue(app.container.hasBinding('Adonis/Addons/Bouncer'))
    assert.instanceOf(app.container.use('Adonis/Addons/Bouncer'), Bouncer)
  })

  test('get authorizer instance for a given request', async (assert) => {
    const app = await setup(true)
    const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {})
    assert.instanceOf(ctx.bouncer, ActionsAuthorizer)
    assert.strictEqual(ctx.bouncer, ctx.bouncer)
  })
})
