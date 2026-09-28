import assert from 'node:assert/strict'
import test from 'node:test'

import { SubKit } from '../dist/index.js'

const secret = 'CLUB-23AB CDEF'
function client(response) {
  return new SubKit({
    appId: 'app',
    secretKey: 'sk_srv_test',
    apiBaseUrl: 'https://example.invalid',
    fetch: async () => response,
  })
}

function errorContains(error, value) {
  return `${error.message} ${JSON.stringify(error.details)}`.includes(value)
}

for (const [label, response] of [
  ['unexpected fields', Response.json({ appId: 'app', [secret]: 'sensitive' })],
  [
    'structured error',
    Response.json(
      { error: { code: 'forbidden', message: secret, details: { code: secret } } },
      { status: 403 },
    ),
  ],
  ['legacy error', Response.json({ error: secret }, { status: 403 })],
  ['invalid JSON', new Response(secret, { status: 200 })],
]) {
  test(`invitation errors redact credential-bearing ${label}`, async () => {
    await assert.rejects(
      () => client(response).invitations.preview({ subjectId: 'subject', code: secret }),
      (error) => {
        assert.equal(errorContains(error, secret), false)
        assert.equal(typeof error.code, 'string')
        return true
      },
    )
  })
}

test('rate limiting preserves typed status and only bounded retry timing', async () => {
  for (const retryAfterSeconds of [30, 0, 3601, secret]) {
    const response = Response.json(
      {
        error: {
          code: 'rate_limited',
          message: secret,
          requestId: secret,
          details: { retryAfterSeconds, reference: secret },
        },
      },
      { status: 429 },
    )
    await assert.rejects(
      () => client(response).invitations.preview({ subjectId: 'subject', code: secret }),
      (error) => {
        assert.equal(error.code, 'rate_limited')
        assert.equal(error.status, 429)
        assert.deepEqual(
          error.details,
          retryAfterSeconds === 30 ? { retryAfterSeconds: 30 } : undefined,
        )
        assert.equal(error.requestId, null)
        assert.equal(errorContains(error, secret), false)
        return true
      },
    )
  }
})

test('transport diagnostics cannot leak invitation credentials or trigger retries', async () => {
  let calls = 0
  const subkit = new SubKit({
    appId: 'app',
    secretKey: 'sk_srv_test',
    apiBaseUrl: 'https://example.invalid',
    fetch: async () => {
      calls++
      throw new Error(secret)
    },
  })
  await assert.rejects(
    () => subkit.invitations.preview({ subjectId: 'subject', code: secret }),
    (error) => {
      assert.equal(error.code, 'network')
      assert.equal(error.status, 0)
      assert.equal(errorContains(error, secret), false)
      return true
    },
  )
  assert.equal(calls, 1)
})

test('invitation validation does not echo unknown input fields into errors', async () => {
  const subkit = client(Response.json(null))
  await assert.rejects(
    async () => subkit.invitations.preview({ subjectId: 'subject', code: secret, [secret]: true }),
    (error) => {
      assert.equal(errorContains(error, secret), false)
      return true
    },
  )
})

test('a bound terminal preview keeps only its typed rejection reason', async () => {
  for (const rejection of ['expired', 'used', 'unavailable']) {
    const response = Response.json(
      {
        error: {
          code: 'invalid_request',
          message: secret,
          details: { rejection, code: secret },
        },
      },
      { status: 409 },
    )
    await assert.rejects(
      () => client(response).invitations.preview({ subjectId: 'subject', code: secret }),
      (error) => {
        assert.equal(error.code, 'invalid_request')
        assert.equal(error.status, 409)
        assert.deepEqual(error.details, { rejection })
        assert.equal(errorContains(error, secret), false)
        return true
      },
    )
  }
  const forged = Response.json(
    { error: { code: 'invalid_request', message: 'x', details: { rejection: secret } } },
    { status: 409 },
  )
  await assert.rejects(
    () => client(forged).invitations.preview({ subjectId: 'subject', code: secret }),
    (error) => {
      assert.equal(error.details, undefined)
      return true
    },
  )
})

test('invitationRejectionOf reads only typed 409 rejections', async () => {
  const { invitationRejectionOf, SubKitApiError } = await import('../dist/index.js')
  const error = (status, details) =>
    new SubKitApiError({ code: 'invalid_request', status, message: 'x', details })
  assert.equal(invitationRejectionOf(error(409, { rejection: 'used' })), 'used')
  assert.equal(invitationRejectionOf(error(400, { rejection: 'used' })), null)
  assert.equal(invitationRejectionOf(error(409, { rejection: 'changed' })), null)
  assert.equal(invitationRejectionOf(new Error('used')), null)
})
