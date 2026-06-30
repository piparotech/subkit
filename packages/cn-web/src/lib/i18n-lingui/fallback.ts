// The source-text fallback resolver — the executable core of acceptance AC-4: a locale that has no
// translation for a key must show the SOURCE text (the message authored in the source locale, e.g.
// `de`), never the raw message id/key. Lingui's runtime already does this when the message catalog
// carries the source string as the value, but compiled target catalogs frequently ship a key with an
// EMPTY value for untranslated entries — and Lingui then renders the id. This resolver makes the
// fallback chain explicit and deterministic, and is what `i18n.missing` is wired to in the Shell.
//
// Pure and isomorphic: no Lingui import, no React.

/** A compiled Lingui catalog: message id → compiled message (string, or empty when untranslated). */
export type Messages = Record<string, string | undefined>

export type ResolveMessageOptions = {
  /** Message id (Lingui uses the source text itself as the id by default). */
  id: string
  /** The active locale's compiled catalog. */
  messages: Messages
  /** The source-locale catalog (e.g. `de`) — the authoritative fallback values. */
  sourceMessages?: Messages
  /**
   * The source text passed at the call site (Lingui's `<Trans>`/`t` carries it). Highest-confidence
   * fallback because it is always present even when no source catalog is loaded.
   */
  sourceText?: string
}

/** A message value counts as "present" only when it is a non-empty string. */
function present(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Resolve a message id to the string to render, applying the fallback chain:
 *
 *   1. the active locale's translation (when non-empty),
 *   2. the source text from the call site,
 *   3. the source-locale catalog's value,
 *   4. and only as a last resort the id itself (so a truly unknown key is still visible, never blank).
 *
 * Steps 2–3 are the AC-4 guarantee: an untranslated key shows the source text, not the key.
 */
export function resolveMessage(options: ResolveMessageOptions): string {
  const { id, messages, sourceMessages, sourceText } = options
  const active = messages[id]
  if (present(active)) return active
  if (present(sourceText)) return sourceText
  if (sourceMessages) {
    const fromSource = sourceMessages[id]
    if (present(fromSource)) return fromSource
  }
  return id
}

/**
 * Build the `missing` handler Lingui calls when a message is absent/empty for the active locale.
 * Wiring this into `i18n.activate(locale, { missing })` (via the Shell) guarantees a missing key
 * renders the source text rather than the key. The source-locale catalog is the fallback table.
 */
export function createMissingHandler(
  sourceMessages: Messages,
): (locale: string, id: string) => string {
  return (_locale, id) => resolveMessage({ id, messages: {}, sourceMessages })
}
