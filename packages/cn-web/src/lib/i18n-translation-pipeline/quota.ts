import type { UsageReport } from './translator'

// The quota guard. Two independent caps protect the API budget: a per-run `maxChars` ceiling on how
// much THIS run may translate, and a pre-flight check against the provider's remaining quota (DeepL
// Free counts retries too — never blow past it). The pipeline asks `canTranslate` before each batch
// and stops cleanly (saving partial progress) the moment a batch would cross either cap.

export type QuotaState = {
  /** Characters already translated in this run (across previous batches). */
  spent: number
  /** Optional per-run cap (`--max-chars`). undefined = no per-run cap. */
  maxChars?: number
  /** Provider-side remaining budget from the last usage report, if metered. */
  remaining?: number
}

export type QuotaDecision = { ok: true } | { ok: false; reason: 'max-chars' | 'provider-quota' }

/** Compute remaining provider budget from a usage report (null limit ⇒ unmetered ⇒ undefined). */
export function remainingFromUsage(usage: UsageReport): number | undefined {
  if (usage.characterLimit === null) return undefined
  return Math.max(0, usage.characterLimit - usage.characterCount)
}

/**
 * Decide whether translating `batchChars` more characters is allowed. Crossing the per-run cap or
 * the provider's remaining quota is rejected — the pipeline then aborts after persisting, rather
 * than burning more budget on calls that would fail (the NFR).
 */
export function canTranslate(state: QuotaState, batchChars: number): QuotaDecision {
  if (state.maxChars !== undefined && state.spent + batchChars > state.maxChars) {
    return { ok: false, reason: 'max-chars' }
  }
  if (state.remaining !== undefined && batchChars > state.remaining) {
    return { ok: false, reason: 'provider-quota' }
  }
  return { ok: true }
}
