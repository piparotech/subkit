import { hasMarker } from './markers'
import type { PoCatalog, PoEntry } from './po'

// Translation coverage — what fraction of a catalog is translated, and how much is machine output
// still awaiting native-speaker review. The Shell renders this per locale; the pipeline uses
// `isUntranslated` to decide which entries to fill.

/** True if an entry has NO translation yet (empty `msgstr`, or any empty plural form). These are the
 *  ONLY entries the pipeline fills — existing translations are never overwritten (idempotency). */
export function isUntranslated(entry: PoEntry): boolean {
  if (entry.msgidPlural !== undefined) {
    const forms = entry.msgstrPlural ?? []
    if (forms.length === 0) return true
    return forms.some((f) => f.trim() === '')
  }
  return (entry.msgstr ?? '').trim() === ''
}

export type CatalogCoverage = {
  total: number
  translated: number
  untranslated: number
  /** Translated entries carrying a machine marker (`# deepl`/`# llm`) — pending human review. */
  machine: number
  /** translated / total in [0, 1]; 1 for an empty catalog. */
  ratio: number
}

/** Compute coverage stats for one catalog (the header entry is excluded by construction). */
export function coverageOf(catalog: PoCatalog): CatalogCoverage {
  const total = catalog.entries.length
  let translated = 0
  let machine = 0
  for (const entry of catalog.entries) {
    if (isUntranslated(entry)) continue
    translated += 1
    if (hasMarker(entry)) machine += 1
  }
  return {
    total,
    translated,
    untranslated: total - translated,
    machine,
    ratio: total === 0 ? 1 : translated / total,
  }
}
