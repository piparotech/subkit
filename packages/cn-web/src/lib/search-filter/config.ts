import { z } from 'zod'

/**
 * The `search-filter` module's `config.schema` — the typed switch surface for `modules[].config` in a
 * Blueprint. The capability is **provider-neutral**: pick the client-side fuzzy index (default,
 * offline-capable, no external service) OR a backend full-text endpoint (Postgres-FTS) for large
 * datasets. `mode` is the pick-one switch; the rest tunes ranking, debounce and the UI copy.
 */

/** Where the search runs. `client` = in-app fuzzy index (offline); `backend` = full-text endpoint. */
export const SearchMode = z.enum(['client', 'backend'])
export type SearchMode = z.infer<typeof SearchMode>

/** Relevance-ranking knobs for the client-side fuzzy index. */
export const RankingConfig = z.strictObject({
  /** Minimum normalized score (0..1) a hit must reach to appear. */
  threshold: z.number().min(0).max(1).default(0.3),
  /** Per-prefix-match bonus added on top of the substring score. */
  prefixBoost: z.number().min(0).max(1).default(0.1),
  /** Hard cap on returned hits (the Shell paginates the rest). */
  maxResults: z.number().int().positive().max(1000).default(50),
})
export type RankingConfig = z.infer<typeof RankingConfig>

/** Customer-editable UI copy (the Cockpit may edit these; see searchFilterConfigRights). */
export const SearchTexts = z.strictObject({
  placeholder: z.string().default('Suchen …'),
  emptyTitle: z.string().default('Keine Treffer'),
  emptyDescription: z.string().default('Versuche es mit einem anderen Suchbegriff.'),
  offlineNotice: z.string().default('Offline — lokale Suche'),
  clearFilters: z.string().default('Filter zurücksetzen'),
})
export type SearchTexts = z.infer<typeof SearchTexts>

export const SearchFilterConfig = z.strictObject({
  mode: SearchMode.default('client'),
  /** Debounce before a query is dispatched (ms) — protects the backend / smooths typing. */
  debounceMs: z.number().int().min(0).max(2000).default(200),
  /** Whether the Shell falls back to the local fuzzy index when the backend is unreachable. */
  offlineFallback: z.boolean().default(true),
  ranking: RankingConfig.default(() => RankingConfig.parse({})),
  texts: SearchTexts.default(() => SearchTexts.parse({})),
})
export type SearchFilterConfig = z.infer<typeof SearchFilterConfig>

/**
 * Rights model ("wer darf bedienen") — per config path: `customer` = editable in the Cockpit,
 * `piparo` = piparo-only (architecture/cost-relevant switches stay with piparo).
 */
export type EditableBy = 'piparo' | 'customer'
export const searchFilterConfigRights: Record<string, EditableBy> = {
  mode: 'piparo',
  debounceMs: 'piparo',
  offlineFallback: 'piparo',
  ranking: 'piparo',
  texts: 'customer',
}

/** Parse + validate a search-filter module config (returns the Zod safeParse result). */
export function parseSearchFilterConfig(input: unknown) {
  return SearchFilterConfig.safeParse(input)
}
