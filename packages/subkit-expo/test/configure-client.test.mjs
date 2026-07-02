import { strict as assert } from 'node:assert'
import test from 'node:test'

import { client, configureSubKit, getConfiguredSubKitClient } from '../dist/index.js'

function createIapAdapter() {
  return {
    async fetchProducts() {
      return []
    },
    async finishTransaction() {},
    async getAvailablePurchases() {
      return []
    },
    async initConnection() {
      return true
    },
    async requestPurchase() {
      return null
    },
  }
}

test('client throws before configureSubKit is called', () => {
  assert.throws(
    () => client.getCustomerInfo,
    /Call configureSubKit\(\.\.\.\) before accessing client/,
  )
})

test('configureSubKit installs the global client proxy target', async () => {
  const configuredClient = configureSubKit({
    adapterBundle: { iap: createIapAdapter() },
    appStateSource: {
      getCurrentState: () => 'active',
      subscribe: () => ({ remove() {} }),
    },
    appUserId: 'user_123',
    autoStart: false,
    installationId: 'install_123',
    platform: 'ios',
    sdkKey: 'runtime_public_key',
  })

  assert.equal(getConfiguredSubKitClient(), configuredClient)
  assert.equal(client.stop, configuredClient.stop)
  client.stop()
})

test('configureSubKit starts the client by default', async () => {
  let initConnectionCount = 0
  configureSubKit({
    adapterBundle: {
      iap: {
        ...createIapAdapter(),
        async initConnection() {
          initConnectionCount += 1
          return true
        },
      },
    },
    appStateSource: {
      getCurrentState: () => 'active',
      subscribe: () => ({ remove() {} }),
    },
    installationId: 'install_123',
    platform: 'ios',
    sdkKey: 'runtime_public_key',
  })

  await new Promise((resolve) => setTimeout(resolve, 0))

  assert.equal(initConnectionCount, 1)
  client.stop()
})
