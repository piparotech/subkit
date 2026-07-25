const reactNativeStub = `
export const Platform = { OS: 'ios' }
export const AppState = {
  currentState: 'active',
  addEventListener() {
    return { remove() {} }
  },
}
`

const asyncStorageStub = `
const values = new Map()
const storage = {
  async getItem(key) { return values.get(key) ?? null },
  async removeItem(key) { values.delete(key) },
  async setItem(key, value) { values.set(key, value) },
}
export default storage
`

const secureStoreStub = `
const values = new Map()
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 1
export async function deleteItemAsync(key) { values.delete(key) }
export async function getItemAsync(key) { return values.get(key) ?? null }
export async function setItemAsync(key, value) { values.set(key, value) }
`

const expoIapStub = `
export async function endConnection() {}
export async function fetchProducts() { return [] }
export async function finishTransaction() {}
export async function getAppTransactionIOS() { return { environment: 'Production' } }
export async function getAvailablePurchases() { return [] }
export async function initConnection() { return true }
export function purchaseErrorListener() { return { remove() {} } }
export function purchaseUpdatedListener() { return { remove() {} } }
export async function requestPurchase() { return null }
export async function restorePurchases() {}
`

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@react-native-async-storage/async-storage') {
    return {
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent(asyncStorageStub)}`,
    }
  }
  if (specifier === 'react-native') {
    return {
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent(reactNativeStub)}`,
    }
  }
  if (specifier === 'expo-secure-store') {
    return {
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent(secureStoreStub)}`,
    }
  }
  if (specifier === 'expo-iap') {
    return {
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent(expoIapStub)}`,
    }
  }
  return nextResolve(specifier, context)
}
