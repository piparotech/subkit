import { strict as assert } from 'node:assert'
import test from 'node:test'

import {
  customerDeviceAccessSchema,
  deviceActivationPolicySchema,
  deviceBlockedReasonSchema,
  purchaseBeneficiaryPolicySchema,
  runtimeDeviceActivationResultSchema,
} from '../dist/index.js'

test('public contracts express every beneficiary mode and device blocked result', () => {
  for (const mode of ['store_portable', 'claim_to_account', 'account_required']) {
    assert.equal(purchaseBeneficiaryPolicySchema.parse(mode), mode)
  }
  for (const reason of [
    'LOGIN_REQUIRED',
    'BENEFICIARY_CONFLICT',
    'DEVICE_SELECTION_REQUIRED',
    'DEVICE_REPLACEMENT_COOLDOWN',
    'DEVICE_CHANGE_LIMIT_REACHED',
    'DEVICE_REPLACED',
  ]) {
    assert.equal(deviceBlockedReasonSchema.parse(reason), reason)
  }
})

test('beneficiary policies remain closed and ownership/device conflicts are typed', () => {
  assert.throws(() => purchaseBeneficiaryPolicySchema.parse('anonymous_alias'))
  for (const conflict of ['LOGIN_REQUIRED', 'BENEFICIARY_CONFLICT']) {
    assert.equal(deviceBlockedReasonSchema.parse(conflict), conflict)
  }
})

test('CustomerInfo keeps commercial access distinct from installation access', () => {
  assert.deepEqual(
    customerDeviceAccessSchema.parse({
      accessExpiresAt: '2026-08-01T00:00:00.000Z',
      activation: null,
      blockedReason: 'DEVICE_CHANGE_LIMIT_REACHED',
      commerciallyActive: true,
    }),
    {
      accessExpiresAt: '2026-08-01T00:00:00.000Z',
      activation: null,
      blockedReason: 'DEVICE_CHANGE_LIMIT_REACHED',
      commerciallyActive: true,
    },
  )
})

test('device blocked results expose selectable activation ids and rolling budget state', () => {
  const result = runtimeDeviceActivationResultSchema.parse({
    blockedReason: 'DEVICE_CHANGE_LIMIT_REACHED',
    changeBudget: {
      limit: 3,
      remaining: 0,
      used: 3,
      windowEndsAt: '2026-08-01T00:00:00.000Z',
    },
    devices: [
      {
        activationGroupKey: 'pro',
        activationId: 'activation_redacted_1',
        expiresAt: '2026-08-01T00:00:00.000Z',
        installationLabel: null,
        lastSeenAt: null,
        policyVersionId: 'version_1',
        state: 'active',
      },
    ],
    nextAllowedAt: '2026-08-01T00:00:00.000Z',
    status: 'blocked',
  })
  assert.equal(result.devices[0].activationId, 'activation_redacted_1')
  assert.equal(result.changeBudget.remaining, 0)
})

test('device policy validates as one complete immutable object', () => {
  const policy = deviceActivationPolicySchema.parse({
    activationGroupKey: 'pro',
    changeWindowIso: 'P30D',
    enforcementMode: 'shadow',
    leaseTtlIso: 'P30D',
    maxActiveDevices: 1,
    maxDistinctInstallations: 3,
    minimumReplacementIntervalIso: 'P1D',
    offlineGraceIso: 'P7D',
    overflowMode: 'auto_replace_single',
    renewBeforeIso: 'P1D',
    resolutionRank: 10,
  })
  assert.equal(policy.activationGroupKey, 'pro')
  assert.equal(policy.maxActiveDevices, 1)
})
