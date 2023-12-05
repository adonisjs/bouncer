/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { AuthorizationResponse } from '../src/response.js'

test.group('AuthorizationResponse', () => {
  test('create denied response', ({ assert }) => {
    const response = AuthorizationResponse.deny()
    assert.isUndefined(response.message)
    assert.isUndefined(response.status)
  })

  test('create denied response with custom status code and message', ({ assert }) => {
    const response = AuthorizationResponse.deny('Post not found', 404)
    assert.equal(response.message, 'Post not found')
    assert.equal(response.status, 404)
  })
  test('create denied response with translation', ({ assert }) => {
    const response = AuthorizationResponse.deny('Post not found', 404).t('errors.not_found')
    assert.equal(response.message, 'Post not found')
    assert.equal(response.status, 404)
    assert.deepEqual(response.translation, { identifier: 'errors.not_found', data: undefined })
  })

  test('create allowed response', ({ assert }) => {
    const response = AuthorizationResponse.allow()
    assert.isUndefined(response.message)
    assert.isUndefined(response.status)
  })
})
