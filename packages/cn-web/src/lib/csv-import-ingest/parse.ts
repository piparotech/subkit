/**
 * The import parser (Engine) — turns raw uploaded bytes/text into a normalized table of string
 * cells, regardless of source format (CSV, TSV / arbitrary delimiter, or a JSON array of objects).
 * Pure and isomorphic (no Node/bun APIs, no DOM): runs identically in the browser upload step, the
 * Shell preview, and the backend's authoritative re-parse.
 *
 * Why delimiter + encoding detection: the capability's first stumbling block is "Encoding/Trennzeichen
 * variieren je Quelle — Erkennung vorsehen, sonst zerschossene Umlaute". We sniff the delimiter from
 * the header line and strip a UTF-8/UTF-16 BOM so umlauts survive the round-trip.
 */

/** A parsed table: the header row + the data rows, each row a string[] aligned to the header. */
export type ParsedTable = {
  format: SourceFormat
  delimiter: string
  headers: string[]
  rows: string[][]
}

export type SourceFormat = 'csv' | 'json'

export const SUPPORTED_DELIMITERS = [',', ';', '\t', '|'] as const
export type Delimiter = (typeof SUPPORTED_DELIMITERS)[number]

export type ParseOptions = {
  /** Force a delimiter instead of sniffing (CSV/TSV only). */
  delimiter?: Delimiter
  /** Force a format instead of sniffing. */
  format?: SourceFormat
}

const BOM = '﻿'

/** Strip a leading UTF-8 BOM so the first header cell is not prefixed with an invisible char. */
export function stripBom(text: string): string {
  return text.startsWith(BOM) ? text.slice(1) : text
}

/** Sniff the delimiter from the first non-empty line: pick the candidate with the most occurrences. */
export function detectDelimiter(text: string): Delimiter {
  const firstLine =
    stripBom(text)
      .split(/\r\n|\r|\n/)
      .find((line) => line.trim() !== '') ?? ''
  let best: Delimiter = ','
  let bestCount = -1
  for (const candidate of SUPPORTED_DELIMITERS) {
    const count = countOutsideQuotes(firstLine, candidate)
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

function countOutsideQuotes(line: string, delimiter: string): number {
  let count = 0
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (!inQuotes && char === delimiter) {
      count++
    }
  }
  return count
}

/** Detect the source format: a leading `[` or `{` ⇒ JSON, otherwise delimited text. */
export function detectFormat(text: string): SourceFormat {
  const trimmed = stripBom(text).trimStart()
  return trimmed.startsWith('[') || trimmed.startsWith('{') ? 'json' : 'csv'
}

/**
 * RFC-4180-ish field splitter for a single record line, honoring quoted fields and `""` escapes.
 * Operates on already-split logical records (quoted newlines handled by `splitRecords`).
 */
function splitFields(record: string, delimiter: string): string[] {
  const fields: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < record.length; i++) {
    const char = record[i]
    if (inQuotes) {
      if (char === '"') {
        if (record[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      fields.push(field)
      field = ''
    } else {
      field += char
    }
  }
  fields.push(field)
  return fields
}

/** Split text into logical records, treating newlines inside quoted fields as part of the field. */
function splitRecords(text: string): string[] {
  const records: string[] = []
  let record = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      inQuotes = !inQuotes
      record += char
    } else if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') i++
      records.push(record)
      record = ''
    } else {
      record += char
    }
  }
  if (record !== '') records.push(record)
  return records
}

/** Parse delimited text (CSV/TSV) into a header + aligned rows. Empty trailing lines are dropped. */
export function parseCsv(text: string, delimiter: string): ParsedTable {
  const clean = stripBom(text)
  const records = splitRecords(clean).filter((line) => line.trim() !== '')
  if (records.length === 0) return { format: 'csv', delimiter, headers: [], rows: [] }

  const headers = splitFields(records[0] as string, delimiter).map((h) => h.trim())
  const rows = records.slice(1).map((record) => {
    const fields = splitFields(record, delimiter)
    // Pad/truncate to the header width so every row aligns to the columns.
    return headers.map((_, i) => (fields[i] ?? '').trim())
  })
  return { format: 'csv', delimiter, headers, rows }
}

/** Parse a JSON array of flat objects into a header (union of keys) + aligned rows. */
export function parseJson(text: string): ParsedTable {
  const data: unknown = JSON.parse(stripBom(text))
  const list = Array.isArray(data) ? data : [data]
  const headerSet: string[] = []
  for (const item of list) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      for (const key of Object.keys(item)) {
        if (!headerSet.includes(key)) headerSet.push(key)
      }
    }
  }
  const rows = list.map((item) => {
    const record = (item ?? {}) as Record<string, unknown>
    return headerSet.map((key) => stringifyCell(record[key]))
  })
  return { format: 'json', delimiter: ',', headers: headerSet, rows }
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Parse raw text in any supported format, sniffing format + delimiter unless overridden. */
export function parseTable(text: string, opts: ParseOptions = {}): ParsedTable {
  const format = opts.format ?? detectFormat(text)
  if (format === 'json') return parseJson(text)
  const delimiter = opts.delimiter ?? detectDelimiter(text)
  return parseCsv(text, delimiter)
}
