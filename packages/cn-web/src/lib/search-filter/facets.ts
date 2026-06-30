/**
 * Facet filtering for the `search-filter` capability — pure, isomorphic, dependency-free. A facet is a
 * named dimension (e.g. "category", "tag") whose value(s) are read off an item; the active selection
 * narrows a result set, and the Engine reports the remaining count per facet value so the Shell can
 * render counts next to each option. Multi-value facets (an item with several tags) are supported.
 *
 * Combination semantics (the conventional faceted-search default):
 *   - within ONE facet, selected values are OR-combined (category = a OR b),
 *   - across facets, the selections are AND-combined (category AND tag).
 * Apply facets AFTER the text search so the two compose: `applyFacets(index.search(q), facets, sel)`.
 */

/** A facet dimension: how to read an item's value(s) for that facet. */
export type FacetDef<T> = {
  /** Stable facet key (matches a key in the selection map and the FacetCounts output). */
  key: string
  /** Read the item's value(s) for this facet. Return a string, an array, or null/undefined for none. */
  get: (item: T) => string | string[] | null | undefined
}

/** The active selection: facet key → the set of selected values (empty/absent = no constraint). */
export type FacetSelection = Record<string, string[]>

/** Per-facet, per-value remaining counts: `{ category: { news: 3, sport: 1 } }`. */
export type FacetCounts = Record<string, Record<string, number>>

function valuesOf<T>(def: FacetDef<T>, item: T): string[] {
  const raw = def.get(item)
  if (raw == null) return []
  return Array.isArray(raw) ? raw.filter((v) => v.length > 0) : raw.length > 0 ? [raw] : []
}

/** Does an item satisfy ONE facet's selection (OR within the facet; empty selection = pass)? */
function matchesFacet<T>(def: FacetDef<T>, item: T, selected: string[] | undefined): boolean {
  if (!selected || selected.length === 0) return true
  const values = valuesOf(def, item)
  return values.some((v) => selected.includes(v))
}

/**
 * Narrow `items` to those satisfying EVERY facet's selection (AND across facets, OR within a facet).
 * Order is preserved, so a relevance-sorted result stays relevance-sorted after faceting.
 */
export function applyFacets<T>(
  items: readonly T[],
  defs: readonly FacetDef<T>[],
  selection: FacetSelection,
): T[] {
  if (defs.length === 0) return [...items]
  return items.filter((item) => defs.every((def) => matchesFacet(def, item, selection[def.key])))
}

/**
 * Count, per facet value, how many items would remain if that value were added — computed against the
 * set narrowed by all OTHER facets (the standard "what each option would give me" facet count). This
 * lets the Shell show live counts that respect the current selection without zeroing the facet the
 * user is actively editing.
 */
export function facetCounts<T>(
  items: readonly T[],
  defs: readonly FacetDef<T>[],
  selection: FacetSelection,
): FacetCounts {
  const counts: FacetCounts = {}
  for (const def of defs) {
    const others = defs.filter((d) => d.key !== def.key)
    const base = items.filter((item) =>
      others.every((d) => matchesFacet(d, item, selection[d.key])),
    )
    const perValue: Record<string, number> = {}
    for (const item of base) {
      for (const value of valuesOf(def, item)) {
        perValue[value] = (perValue[value] ?? 0) + 1
      }
    }
    counts[def.key] = perValue
  }
  return counts
}

/** Toggle a value in a facet selection (immutable) — the Shell's chip/checkbox handler. */
export function toggleFacet(selection: FacetSelection, key: string, value: string): FacetSelection {
  const current = selection[key] ?? []
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  const out = { ...selection, [key]: next }
  if (next.length === 0) delete out[key]
  return out
}

/** True if any facet has at least one selected value. */
export function hasActiveFacets(selection: FacetSelection): boolean {
  return Object.values(selection).some((values) => values.length > 0)
}
