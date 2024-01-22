/*
 * @adonisjs/bouncer
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { E_AUTHORIZATION_FAILURE } from '../src/errors.js'
import { AuthorizationResponse } from '../src/response.js'
import { I18nManagerFactory } from '@adonisjs/i18n/factories'
import { HttpContextFactory } from '@adonisjs/core/factories/http'

test.group('AuthorizationException', () => {
  test('make HTTP response with default message and status code', async ({ assert }) => {
    const exception = new E_AUTHORIZATION_FAILURE(new AuthorizationResponse(false))
    const ctx = new HttpContextFactory().create()

    await exception.handle(exception, ctx)
    assert.equal(ctx.response.getBody(), 'Access denied')
    assert.equal(ctx.response.getStatus(), 403)
  })

  test('make HTTP response with response error message and status code', async ({ assert }) => {
    const exception = new E_AUTHORIZATION_FAILURE(AuthorizationResponse.deny('Post not found', 404))
    const ctx = new HttpContextFactory().create()

    await exception.handle(exception, ctx)
    assert.equal(ctx.response.getBody(), 'Post not found')
    assert.equal(ctx.response.getStatus(), 404)
  })

  test('use default translation identifier for message when using i18n', async ({ assert }) => {
    const i18nManager = new I18nManagerFactory()
      .merge({
        config: {
          loaders: [
            () => {
              return {
                async load() {
                  return {
                    en: {
                      'errors.E_AUTHORIZATION_FAILURE': 'Access denied from translations',
                    },
                  }
                },
              }
            },
          ],
        },
      })
      .create()

    await i18nManager.loadTranslations()

    const exception = new E_AUTHORIZATION_FAILURE(AuthorizationResponse.deny('Post not found', 404))
    const ctx = new HttpContextFactory().create()
    ctx.i18n = i18nManager.locale('en')

    await exception.handle(exception, ctx)
    assert.equal(ctx.response.getBody(), 'Access denied from translations')
    assert.equal(ctx.response.getStatus(), 404)
  })

  test('use response translation identifier for message when using i18n', async ({ assert }) => {
    const i18nManager = new I18nManagerFactory()
      .merge({
        config: {
          loaders: [
            () => {
              return {
                async load() {
                  return {
                    en: {
                      'errors.E_AUTHORIZATION_FAILURE': 'Access denied from translations',
                      'errors.not_found': 'Page not found',
                    },
                  }
                },
              }
            },
          ],
        },
      })
      .create()

    await i18nManager.loadTranslations()

    const exception = new E_AUTHORIZATION_FAILURE(
      AuthorizationResponse.deny('Post not found', 404).t('errors.not_found')
    )
    const ctx = new HttpContextFactory().create()
    ctx.i18n = i18nManager.locale('en')

    await exception.handle(exception, ctx)
    assert.equal(ctx.response.getBody(), 'Page not found')
    assert.equal(ctx.response.getStatus(), 404)
  })

  test('get JSON response', async ({ assert }) => {
    const exception = new E_AUTHORIZATION_FAILURE(new AuthorizationResponse(false))
    const ctx = new HttpContextFactory().create()
    ctx.request.request.headers.accept = 'application/json'

    await exception.handle(exception, ctx)
    assert.deepEqual(ctx.response.getBody(), { errors: [{ message: 'Access denied' }] })
    assert.equal(ctx.response.getStatus(), 403)
  })

  test('get JSONAPI response', async ({ assert }) => {
    const exception = new E_AUTHORIZATION_FAILURE(new AuthorizationResponse(false))
    const ctx = new HttpContextFactory().create()
    ctx.request.request.headers.accept = 'application/vnd.api+json'

    await exception.handle(exception, ctx)
    assert.deepEqual(ctx.response.getBody(), {
      errors: [{ code: 'E_AUTHORIZATION_FAILURE', title: 'Access denied' }],
    })
    assert.equal(ctx.response.getStatus(), 403)
  })
})
