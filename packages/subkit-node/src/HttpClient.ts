import { type ZodType, z } from 'zod'

import { type SubKitErrorCode, subKitApiErrorResponseSchema } from '@piparotech/subkit-core'

import { SubKitApiError } from './errors.js'
import type { SubKitRequestOptions } from './requestOptions.js'

interface HttpClientOptions {
  apiBaseUrl: string
  fetchImpl: typeof fetch
  secretKey: string
  timeoutMs: number
  userAgent: string
}

interface RequestOptions<ResponseBody> extends SubKitRequestOptions {
  body: unknown
  responseSchema: ZodType<ResponseBody>
}

const legacyErrorSchema = z.object({ error: z.string().min(1) })

export class HttpClient {
  private readonly apiBaseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly secretKey: string
  private readonly timeoutMs: number
  private readonly userAgent: string

  constructor(options: HttpClientOptions) {
    this.apiBaseUrl = options.apiBaseUrl.replace(/\/+$/, '')
    this.fetchImpl = options.fetchImpl
    this.secretKey = options.secretKey
    this.timeoutMs = options.timeoutMs
    this.userAgent = options.userAgent
  }

  post<ResponseBody>(path: string, options: RequestOptions<ResponseBody>): Promise<ResponseBody> {
    return this.request('POST', path, options)
  }

  patch<ResponseBody>(path: string, options: RequestOptions<ResponseBody>): Promise<ResponseBody> {
    return this.request('PATCH', path, options)
  }

  delete<ResponseBody>(path: string, options: RequestOptions<ResponseBody>): Promise<ResponseBody> {
    return this.request('DELETE', path, options)
  }

  private async request<ResponseBody>(
    method: 'DELETE' | 'PATCH' | 'POST',
    path: string,
    options: RequestOptions<ResponseBody>,
  ): Promise<ResponseBody> {
    const timeoutMs = options.timeoutMs ?? this.timeoutMs
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const signal = mergeAbortSignals(options.signal, controller.signal)

    try {
      const response = await this.fetchImpl(`${this.apiBaseUrl}${path}`, {
        body: JSON.stringify(options.body),
        headers: this.createHeaders(options.idempotencyKey),
        method,
        signal,
      })
      const payload = await readJson(response)

      if (!response.ok) {
        throw createApiError(response.status, payload)
      }

      const parsed = options.responseSchema.safeParse(payload)
      if (!parsed.success) {
        throw new SubKitApiError({
          code: 'validation_failed',
          details: parsed.error.issues,
          message: 'SubKit API returned an unexpected response shape',
          status: response.status,
        })
      }

      return parsed.data
    } catch (error) {
      if (error instanceof SubKitApiError) throw error
      if (isAbortError(error)) {
        throw new SubKitApiError({
          code: 'network',
          message: 'SubKit API request timed out',
          status: 0,
        })
      }
      throw new SubKitApiError({
        code: 'network',
        details: safeErrorMessage(error),
        message: 'SubKit API request failed',
        status: 0,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  private createHeaders(idempotencyKey: string | undefined): Headers {
    const headers = new Headers({
      accept: 'application/json',
      authorization: `Bearer ${this.secretKey}`,
      'content-type': 'application/json',
      'user-agent': this.userAgent,
    })
    if (idempotencyKey != null) headers.set('idempotency-key', idempotencyKey)
    return headers
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.trim() === '') return null

  try {
    return JSON.parse(text)
  } catch (error) {
    throw new SubKitApiError({
      code: 'validation_failed',
      details: safeErrorMessage(error),
      message: 'SubKit API returned invalid JSON',
      status: response.status,
    })
  }
}

function createApiError(status: number, payload: unknown): SubKitApiError {
  const structured = subKitApiErrorResponseSchema.safeParse(payload)
  if (structured.success) {
    return new SubKitApiError({
      code: structured.data.error.code,
      details: structured.data.error.details,
      message: structured.data.error.message,
      requestId: structured.data.error.requestId,
      status,
    })
  }

  const legacy = legacyErrorSchema.safeParse(payload)
  if (legacy.success) {
    return new SubKitApiError({ code: mapStatusToCode(status), message: legacy.data.error, status })
  }

  return new SubKitApiError({
    code: mapStatusToCode(status),
    details: payload,
    message: `SubKit API request failed with status ${status}`,
    status,
  })
}

function mapStatusToCode(status: number): SubKitErrorCode {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 429) return 'rate_limited'
  if (status === 503) return 'service_unavailable'
  if (status >= 500) return 'server_error'
  return 'invalid_request'
}

function mergeAbortSignals(first: AbortSignal | undefined, second: AbortSignal): AbortSignal {
  if (first == null) return second
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (first.aborted || second.aborted) {
    controller.abort()
    return controller.signal
  }
  first.addEventListener('abort', abort, { once: true })
  second.addEventListener('abort', abort, { once: true })
  return controller.signal
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
