export interface SubKitRequestOptions {
  idempotencyKey?: string
  signal?: AbortSignal
  timeoutMs?: number
}

export interface SubKitMutationOptions extends SubKitRequestOptions {
  idempotencyKey: string
}
