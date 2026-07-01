export interface SubKitRequestOptions {
  idempotencyKey?: string
  signal?: AbortSignal
  timeoutMs?: number
}
