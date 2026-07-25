import { strict as assert } from 'node:assert'
import test from 'node:test'

import { createRedactingLogger } from '../dist/index.js'

test('SDK logger recursively redacts credentials, evidence and device identifiers', () => {
  const entries = []
  const logger = createRedactingLogger({
    debug(message, context) {
      entries.push({ context, message })
    },
    error(message, context) {
      entries.push({ context, message })
    },
    warn(message, context) {
      entries.push({ context, message })
    },
  })
  logger.warn('failed with sk_device_secret', {
    error: new Error('receipt sk_mgmt_secret'),
    installationId: 'raw-installation',
    nested: { purchaseToken: 'raw-purchase-token', safe: 'ok' },
    sdkKey: 'sk_sdk_secret',
  })
  const serialized = JSON.stringify(entries)
  for (const forbidden of [
    'sk_device_secret',
    'sk_mgmt_secret',
    'raw-installation',
    'raw-purchase-token',
    'sk_sdk_secret',
  ]) {
    assert.equal(serialized.includes(forbidden), false)
  }
  assert.equal(serialized.includes('ok'), true)
  assert.equal(serialized.includes('[REDACTED]'), true)
})
