// A minimal, lossless gettext PO parser/serializer — enough for the translation pipeline.
// It preserves entry order, leading comments and the empty-msgid header verbatim, and supports
// both singular (`msgstr`) and plural (`msgstr[N]`) entries. The pipeline only ever fills EMPTY
// translations, so a faithful round-trip (parse → serialize unchanged) is the load-bearing property.

/** A single PO entry. Singular entries use `msgstr`; plural entries use `msgstrPlural` (and carry
 *  a `msgidPlural`). Exactly one of the two translation forms is populated per entry. */
export type PoEntry = {
  /** Translator/extracted/flag comment lines as they appeared, WITHOUT the trailing newline.
   *  Includes leading `#`. Machine markers (`# deepl`/`# llm`) are stored here. */
  comments: string[]
  msgctxt?: string
  msgid: string
  msgidPlural?: string
  /** Singular translation (undefined for plural entries). */
  msgstr?: string
  /** Plural translations indexed by form (undefined for singular entries). */
  msgstrPlural?: string[]
}

export type PoCatalog = {
  /** The header block (the entry with an empty `msgid`), kept verbatim, or undefined if absent. */
  header?: PoEntry
  entries: PoEntry[]
}

function unescape(raw: string): string {
  return raw.replace(/\\(.)/g, (_, c: string) => {
    switch (c) {
      case 'n':
        return '\n'
      case 't':
        return '\t'
      case 'r':
        return '\r'
      case '"':
        return '"'
      case '\\':
        return '\\'
      default:
        return c
    }
  })
}

function escape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r')
}

/** Concatenate the quoted-string continuation lines of a single PO field. */
function joinQuoted(lines: string[]): string {
  return lines.map((l) => unescape(l)).join('')
}

type RawField = { keyword: string; index?: number; lines: string[] }

function parseEntryBlock(block: string[]): PoEntry | null {
  const comments: string[] = []
  const fields: RawField[] = []
  let current: RawField | null = null

  for (const line of block) {
    if (line.startsWith('#')) {
      comments.push(line)
      continue
    }
    const quoted = line.match(/^"(.*)"$/)
    if (quoted && current) {
      current.lines.push(quoted[1] ?? '')
      continue
    }
    const field = line.match(/^(msgctxt|msgid|msgid_plural|msgstr)(?:\[(\d+)\])?\s+"(.*)"$/)
    if (field) {
      const keyword = field[1] ?? ''
      const index = field[2] === undefined ? undefined : Number(field[2])
      current = { keyword, index, lines: [field[3] ?? ''] }
      fields.push(current)
      continue
    }
    current = null
  }

  if (fields.length === 0) return comments.length > 0 ? null : null

  const get = (keyword: string) => fields.find((f) => f.keyword === keyword)
  const msgidField = get('msgid')
  if (!msgidField) return null

  const entry: PoEntry = {
    comments,
    msgid: joinQuoted(msgidField.lines),
  }
  const ctxt = get('msgctxt')
  if (ctxt) entry.msgctxt = joinQuoted(ctxt.lines)

  const pluralId = get('msgid_plural')
  if (pluralId) {
    entry.msgidPlural = joinQuoted(pluralId.lines)
    const plurals = fields
      .filter((f) => f.keyword === 'msgstr' && f.index !== undefined)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    entry.msgstrPlural = plurals.map((f) => joinQuoted(f.lines))
  } else {
    const str = get('msgstr')
    entry.msgstr = str ? joinQuoted(str.lines) : ''
  }
  return entry
}

/** Parse PO text into a catalog, splitting on blank lines and keeping order. The empty-`msgid`
 *  header entry is captured separately so the pipeline never treats it as a translatable string. */
export function parsePo(text: string): PoCatalog {
  const normalized = text.replace(/\r\n/g, '\n')
  const blocks = normalized.split(/\n\n+/)
  const entries: PoEntry[] = []
  let header: PoEntry | undefined

  for (const raw of blocks) {
    const lines = raw.split('\n').filter((l) => l.length > 0)
    if (lines.length === 0) continue
    const entry = parseEntryBlock(lines)
    if (!entry) continue
    if (entry.msgid === '' && entry.msgidPlural === undefined) {
      header = entry
      continue
    }
    entries.push(entry)
  }

  return { header, entries }
}

function serializeField(keyword: string, value: string): string {
  return `${keyword} "${escape(value)}"`
}

function serializeEntry(entry: PoEntry): string {
  const out: string[] = [...entry.comments]
  if (entry.msgctxt !== undefined) out.push(serializeField('msgctxt', entry.msgctxt))
  out.push(serializeField('msgid', entry.msgid))
  if (entry.msgidPlural !== undefined) {
    out.push(serializeField('msgid_plural', entry.msgidPlural))
    const forms = entry.msgstrPlural ?? []
    forms.forEach((form, i) => out.push(serializeField(`msgstr[${i}]`, form)))
  } else {
    out.push(serializeField('msgstr', entry.msgstr ?? ''))
  }
  return out.join('\n')
}

/** Serialize a catalog back to PO text (header first, then entries), separated by blank lines and
 *  terminated by a trailing newline — the canonical gettext layout. */
export function serializePo(catalog: PoCatalog): string {
  const blocks: string[] = []
  if (catalog.header) blocks.push(serializeEntry(catalog.header))
  for (const entry of catalog.entries) blocks.push(serializeEntry(entry))
  return blocks.join('\n\n') + '\n'
}
