import { z } from 'zod'

/**
 * The isomorphic trigger client (Engine) — one fetch surface (web + native) for asking the backend to
 * send a transactional mail. The host supplies `getToken` (the auth session controller) so the client
 * never owns auth state; the backend verifies the bearer before it triggers a send.
 *
 * Vendored verbatim from @piparo/email-transactional/client. This is the seam the showcase replaces
 * with an in-memory transport (mock-email-transactional.ts), so the audited request/response contract
 * runs unchanged with no network.
 */

export const TriggerRequest = z.strictObject({
  templateId: z.string(),
  to: z.email(),
  locale: z.string().optional(),
  payload: z.unknown(),
})
export type TriggerRequest = z.infer<typeof TriggerRequest>

export const TriggerResponse = z.strictObject({
  id: z.string(),
  status: z.enum(['sent', 'failed']),
  templateId: z.string(),
  version: z.string(),
  locale: z.string(),
  attempts: z.number(),
})
export type TriggerResponse = z.infer<typeof TriggerResponse>

export type EmailClientOptions = {
  baseUrl: string
  /** Returns a fresh access token (sync or async); null = unauthenticated. */
  getToken: () => Promise<string | null> | string | null
}

export class EmailError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'EmailError'
  }
}

async function codeOf(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { code?: string }
    return body.code ?? `HTTP_${res.status}`
  } catch {
    return `HTTP_${res.status}`
  }
}

export type EmailClient = {
  trigger(request: TriggerRequest): Promise<TriggerResponse>
}

export function createEmailClient(opts: EmailClientOptions): EmailClient {
  const base = opts.baseUrl.replace(/\/$/, '')

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await opts.getToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  return {
    async trigger(request) {
      const res = await fetch(`${base}/email/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(request),
      })
      if (!res.ok) throw new EmailError(res.status, await codeOf(res))
      return TriggerResponse.parse(await res.json())
    },
  }
}
