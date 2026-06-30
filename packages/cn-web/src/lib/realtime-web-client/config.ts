import { z } from 'zod'

/**
 * The `realtime-web-client` module's `config.schema` — the typed switch surface for the live web
 * stream: where it connects, how aggressively it reconnects, and the resume policy used to pick up
 * lost events after a drop. Validated by generator-core.
 */

/** Reconnect policy — exponential backoff with full jitter, capped, with an optional attempt ceiling.
 *  NOTE: the client drives reconnect itself (it does NOT rely on the browser's built-in EventSource
 *  auto-reconnect, which cannot apply backoff or carry an explicit resume cursor). */
export const BackoffConfig = z.strictObject({
  /** First retry delay (ms). */
  baseMs: z.number().int().positive().default(500),
  /** Upper bound for any single retry delay (ms) — backoff never grows past this. */
  maxMs: z
    .number()
    .int()
    .positive()
    .default(30 * 1000),
  /** Multiplier applied each attempt before jitter (2 = double each time). */
  factor: z.number().gt(1).default(2),
  /** Full-jitter fraction in [0,1]: the actual delay is uniform in [delay*(1-jitter), delay]. */
  jitter: z.number().min(0).max(1).default(0.5),
  /** Max reconnect attempts before giving up; `null` = retry forever. */
  maxRetries: z.number().int().positive().nullable().default(null),
})
export type BackoffConfig = z.infer<typeof BackoffConfig>

export const RealtimeWebTexts = z.strictObject({
  connecting: z.string().default('Verbinde …'),
  online: z.string().default('Live'),
  reconnecting: z.string().default('Verbindung verloren – versuche erneut …'),
  offline: z.string().default('Offline'),
})
export type RealtimeWebTexts = z.infer<typeof RealtimeWebTexts>

export const RealtimeWebConfig = z.strictObject({
  /** SSE route mounted by the backend (joined to the app's realtime base URL). */
  path: z.string().startsWith('/').default('/stream'),
  backoff: BackoffConfig.default(() => BackoffConfig.parse({})),
  texts: RealtimeWebTexts.default(() => RealtimeWebTexts.parse({})),
})
export type RealtimeWebConfig = z.infer<typeof RealtimeWebConfig>

/**
 * Rights model ("wer darf bedienen") — per config path: `customer` = editable in the Cockpit,
 * `piparo` = piparo-only. Transport tuning (endpoint path, backoff) is operational/piparo-only; only
 * the user-visible status copy is customer-editable.
 */
export type EditableBy = 'piparo' | 'customer'
export const realtimeWebConfigRights: Record<string, EditableBy> = {
  path: 'piparo',
  backoff: 'piparo',
  texts: 'customer',
}

/** Parse + validate a realtime-web-client module config (returns the Zod safeParse result). */
export function parseRealtimeWebConfig(input: unknown) {
  return RealtimeWebConfig.safeParse(input)
}

/**
 * Compute the backoff delay (ms) for a 0-based attempt index under the given policy. Deterministic
 * given `rand` (defaults to `Math.random`) so it is unit-testable — the live client injects the real
 * RNG, the test injects a fixed one.
 */
export function backoffDelay(
  attempt: number,
  cfg: BackoffConfig,
  rand: () => number = Math.random,
): number {
  const raw = cfg.baseMs * Math.pow(cfg.factor, attempt)
  const capped = Math.min(raw, cfg.maxMs)
  const floor = capped * (1 - cfg.jitter)
  return Math.round(floor + (capped - floor) * rand())
}
