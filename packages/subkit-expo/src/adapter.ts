import type {
  SubKitIapProduct,
  SubKitIapProductType,
  SubKitIapPurchase,
  SubKitPurchaseRequest,
} from './types.js'

export interface SubKitExpoIapAdapter {
  endConnection?(): Promise<void>
  fetchProducts(input: { skus: string[]; type: SubKitIapProductType }): Promise<SubKitIapProduct[]>
  finishTransaction(input: { isConsumable: boolean; purchase: SubKitIapPurchase }): Promise<void>
  getAvailablePurchases(): Promise<SubKitIapPurchase[]>
  initConnection(): Promise<boolean>
  requestPurchase(input: SubKitPurchaseRequest): Promise<SubKitIapPurchase[]>
  restorePurchases?(): Promise<void>
}

export interface SubKitPurchaseListenerSubscription {
  remove(): void
}

export interface SubKitPurchaseListenerAdapter {
  addPurchaseErrorListener(listener: (error: unknown) => void): SubKitPurchaseListenerSubscription
  addPurchaseUpdatedListener(
    listener: (purchase: SubKitIapPurchase) => void,
  ): SubKitPurchaseListenerSubscription
}

export interface SubKitIapAdapterBundle {
  iap: SubKitExpoIapAdapter
  listeners?: SubKitPurchaseListenerAdapter
}
