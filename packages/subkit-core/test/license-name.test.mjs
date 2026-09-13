import assert from 'node:assert/strict'
import test from 'node:test'

import { serverLicenseDetailResponseSchema, serverLicenseSummarySchema } from '../dist/index.js'

for (const [view, schema] of [
  ['list', serverLicenseSummarySchema],
  ['detail', serverLicenseDetailResponseSchema],
]) {
  test(`${view} requires a nullable licensee name, separate from the payer`, () => {
    const nameSchema = schema.pick({ licenseeName: true })
    assert.deepEqual(nameSchema.parse({ licenseeName: 'Anna Grün' }), { licenseeName: 'Anna Grün' })
    assert.deepEqual(nameSchema.parse({ licenseeName: null }), { licenseeName: null })
    assert.equal(nameSchema.safeParse({ billingAccountName: 'Guest purchase' }).success, false)
    assert.equal(nameSchema.safeParse({ licenseeName: 123 }).success, false)
  })
}
