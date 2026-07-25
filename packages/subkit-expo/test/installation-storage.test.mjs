import { strict as assert } from 'node:assert'
import test from 'node:test'

import { createOrGetInstallationId as createAsyncStorageInstallationId } from '../dist/asyncStorage.js'
import { createOrGetInstallationId as createSecureStoreInstallationId } from '../dist/expoSecureStore.js'
import { createOrGetInstallationId } from '../dist/index.js'
import { createOrGetInstallationId as createMmkvInstallationId } from '../dist/mmkv.js'

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    async getItem(key) {
      return values.get(key) ?? null
    },
    async removeItem(key) {
      values.delete(key)
    },
    async setItem(key, value) {
      values.set(key, value)
    },
  }
}

test('createOrGetInstallationId is lazy and creates only after a null read', async () => {
  const events = []
  const storage = memoryStorage()
  const provider = createOrGetInstallationId({
    randomId: () => {
      events.push('generate')
      return 'generated-id'
    },
    storage: {
      async getItem(key) {
        events.push(`get:${key}`)
        return storage.getItem(key)
      },
      setItem: storage.setItem,
    },
    storageKey: 'app.installation',
  })

  assert.deepEqual(events, [])
  assert.equal(await provider(), 'generated-id')
  assert.deepEqual(events, ['get:app.installation', 'generate'])
  assert.equal(storage.values.get('app.installation'), 'generated-id')
})

test('storage read failures never generate a replacement installation id', async () => {
  let generated = false
  const provider = createOrGetInstallationId({
    randomId: () => {
      generated = true
      return 'forbidden-new-id'
    },
    storage: {
      async getItem() {
        throw new Error('storage unavailable')
      },
      async setItem() {},
    },
  })

  await assert.rejects(() => provider(), /storage unavailable/)
  assert.equal(generated, false)
})

test('legacy key migration preserves the old id before removing it', async () => {
  const storage = memoryStorage({ old: 'legacy-id' })
  const provider = createOrGetInstallationId({
    legacyStorageKeys: ['old'],
    randomId: () => 'new-id',
    storage,
    storageKey: 'new',
  })

  assert.equal(await provider(), 'legacy-id')
  assert.equal(storage.values.get('new'), 'legacy-id')
  assert.equal(storage.values.has('old'), false)
})

test('SecureStore subpath uses the same lazy provider contract', async () => {
  const first = createSecureStoreInstallationId({
    randomId: () => 'secure-store-id',
    storageKey: 'test.secure-store',
  })
  assert.equal(await first(), 'secure-store-id')

  const second = createSecureStoreInstallationId({
    randomId: () => 'must-not-replace',
    storageKey: 'test.secure-store',
  })
  assert.equal(await second(), 'secure-store-id')
})

test('AsyncStorage subpath uses the same lazy provider contract', async () => {
  const storage = memoryStorage()
  const provider = createAsyncStorageInstallationId({
    randomId: () => 'async-storage-id',
    storage,
  })

  assert.equal(await provider(), 'async-storage-id')
  assert.equal(await provider(), 'async-storage-id')
})

test('MMKV subpath uses the same lazy provider contract', async () => {
  const values = new Map()
  let reads = 0
  const provider = createMmkvInstallationId({
    randomId: () => 'mmkv-id',
    storage: {
      delete: (key) => values.delete(key),
      getString(key) {
        reads += 1
        return values.get(key)
      },
      set: (key, value) => values.set(key, value),
    },
  })

  assert.equal(reads, 0)
  assert.equal(await provider(), 'mmkv-id')
  assert.equal(reads, 1)
})
