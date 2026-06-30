import type { PoEntry } from './po'

// Machine-translation markers. Every entry the pipeline fills gets a translator marker comment so a
// native-speaker reviewer can FILTER machine output (`# deepl` / `# llm`) and verify it later. The
// markers live in the PO comment block (a gettext translator comment, leading `#`).

export type TranslatorMarker = 'deepl' | 'llm'

/** The exact comment line written for a marker (a gettext translator comment). */
export function markerComment(marker: TranslatorMarker): string {
  return `# ${marker}`
}

const MARKER_LINE = /^#\s*(deepl|llm)\s*$/

/** True if the entry already carries any machine-translation marker. */
export function hasMarker(entry: PoEntry): boolean {
  return entry.comments.some((c) => MARKER_LINE.test(c))
}

/** The marker on an entry, if any (the first one wins). */
export function readMarker(entry: PoEntry): TranslatorMarker | undefined {
  for (const c of entry.comments) {
    const m = c.match(MARKER_LINE)
    if (m) return m[1] as TranslatorMarker
  }
  return undefined
}

/** Add a marker to an entry's comments idempotently (never duplicates an existing marker). Returns
 *  a NEW entry — the input is not mutated, keeping the pipeline's fill step pure. */
export function withMarker(entry: PoEntry, marker: TranslatorMarker): PoEntry {
  if (readMarker(entry) === marker) return entry
  const comments = entry.comments.filter((c) => !MARKER_LINE.test(c))
  return { ...entry, comments: [...comments, markerComment(marker)] }
}
