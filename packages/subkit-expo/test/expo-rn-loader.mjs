const reactNativeStub = `
export const Platform = { OS: 'ios' }
export const AppState = {
  currentState: 'active',
  addEventListener() {
    return { remove() {} }
  },
}
`

const expoIapStub = `
export async function endConnection() {}
export async function fetchProducts() { return [] }
export async function finishTransaction() {}
export async function getAvailablePurchases() { return [] }
export async function initConnection() { return true }
export function purchaseErrorListener() { return { remove() {} } }
export function purchaseUpdatedListener() { return { remove() {} } }
export async function requestPurchase() { return null }
export async function restorePurchases() {}
`

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'react-native') {
    return {
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent(reactNativeStub)}`,
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
