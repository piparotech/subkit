/**
 * The client-side search Engine — a pure, isomorphic, dependency-free fuzzy ranker over an in-memory
 * collection. It is the offline default of the `search-filter` capability: no external service, no
 * subscription, deterministic, and synchronous (a query over thousands of rows returns in well under
 * 200 ms). The host supplies which fields are searchable and how heavily each weighs; nothing about a
 * specific domain leaks into this file (the same Engine drives every app).
 *
 * Scoring (per field, normalized to 0..1, the best field wins):
 *   - exact field match      → 1.0
 *   - prefix match           → 0.9 (+ prefixBoost from config, capped at 1)
 *   - whole-word match       → 0.8
 *   - substring match        → 0.6 scaled by query/field length ratio
 *   - subsequence (typo-ish) → up to 0.5 scaled by contiguity
 * A per-token score is the max over fields; a multi-token query AND-combines (every token must hit)
 * and averages the token scores, then applies the field weight.
 */

/** A field on an item that should be searchable, with a relevance weight (default 1). */
export type SearchField<T> = {
  /** Extract the text to match for this field (e.g. `(x) => x.title`). */
  get: (item: T) => string | null | undefined
  /** Relevance multiplier — a title typically weighs more than a body. Default 1. */
  weight?: number
}

export type IndexOptions<T> = {
  fields: SearchField<T>[]
  /** Minimum normalized score a hit must reach (0..1). Default 0.3. */
  threshold?: number
  /** Bonus added to a prefix hit (capped at 1). Default 0.1. */
  prefixBoost?: number
  /** Hard cap on returned hits. Default 50. */
  maxResults?: number
}

export type SearchHit<T> = {
  item: T
  /** Normalized relevance score (0..1); the result list is sorted by this, descending. */
  score: number
}

const DEFAULTS = { threshold: 0.3, prefixBoost: 0.1, maxResults: 50 } as const

/** Lowercase + collapse whitespace + strip diacritics so "Müller" matches "muller". */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Split a query/field into comparable tokens (whitespace-separated, normalized, non-empty). */
export function tokenize(value: string): string[] {
  const normalized = normalize(value)
  return normalized.length === 0 ? [] : normalized.split(/\s+/)
}

/** Is `query` an in-order subsequence of `text`? Returns the contiguity ratio (0..1) or -1 if not. */
function subsequenceScore(query: string, text: string): number {
  if (query.length === 0) return -1
  let qi = 0
  let runs = 1
  let inRun = false
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) {
      if (qi > 0 && !inRun) runs++
      inRun = true
      qi++
    } else {
      inRun = false
    }
  }
  if (qi < query.length) return -1
  // Fewer contiguous runs = closer to a substring = higher score.
  return 1 / runs
}

/**
 * Score a single normalized query token against a single normalized field value (0..1).
 * Monotonic hierarchy: exact field > exact word > prefix > substring > subsequence.
 */
export function scoreToken(token: string, fieldValue: string, prefixBoost: number): number {
  if (token.length === 0 || fieldValue.length === 0) return 0
  if (fieldValue === token) return 1

  const words = fieldValue.split(/\s+/)
  if (words.includes(token)) return 0.85
  if (fieldValue.startsWith(token) || words.some((w) => w.startsWith(token))) {
    return Math.min(0.84, 0.7 + prefixBoost)
  }
  if (fieldValue.includes(token)) {
    return 0.4 + 0.2 * (token.length / fieldValue.length)
  }
  const sub = subsequenceScore(token, fieldValue)
  return sub < 0 ? 0 : 0.3 * sub
}

/** A built, reusable index over a snapshot of items. Rebuild it when the source data changes. */
export type SearchIndex<T> = {
  /** Run a query against the snapshot. Empty query → all items (capped), score 1, source order. */
  search: (query: string) => SearchHit<T>[]
  /** The number of indexed items (for the host's facet/empty-state logic). */
  size: number
}

/**
 * Build an index over `items`. The index is a pure snapshot — when the underlying data changes the
 * host rebuilds it (cheap; the work is per-query, not per-build), satisfying the "reflects the new
 * state on data change" acceptance criterion via re-load.
 */
export function createIndex<T>(items: readonly T[], options: IndexOptions<T>): SearchIndex<T> {
  const threshold = options.threshold ?? DEFAULTS.threshold
  const prefixBoost = options.prefixBoost ?? DEFAULTS.prefixBoost
  const maxResults = options.maxResults ?? DEFAULTS.maxResults

  // Precompute normalized field values once per item (the per-query hot path stays allocation-light).
  const docs = items.map((item) => ({
    item,
    fields: options.fields.map((field) => ({
      value: normalize(field.get(item) ?? ''),
      weight: field.weight ?? 1,
    })),
  }))

  function search(query: string): SearchHit<T>[] {
    const tokens = tokenize(query)
    if (tokens.length === 0) {
      return docs.slice(0, maxResults).map((d) => ({ item: d.item, score: 1 }))
    }

    const hits: SearchHit<T>[] = []
    for (const doc of docs) {
      let tokenScoreSum = 0
      let everyTokenHit = true
      for (const token of tokens) {
        let best = 0
        for (const field of doc.fields) {
          const score = scoreToken(token, field.value, prefixBoost) * field.weight
          if (score > best) best = score
        }
        if (best === 0) {
          everyTokenHit = false
          break
        }
        tokenScoreSum += best
      }
      if (!everyTokenHit) continue
      const score = Math.min(1, tokenScoreSum / tokens.length)
      if (score >= threshold) hits.push({ item: doc.item, score })
    }

    hits.sort((a, b) => b.score - a.score)
    return hits.slice(0, maxResults)
  }

  return { search, size: docs.length }
}
