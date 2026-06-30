import { z } from 'zod'

import type { ParsedTable } from './parse'

/**
 * The mapping layer (Engine) — describes the import target (which fields exist, their type, which are
 * required, which form the natural key) and the user's column→field mapping. Pure + isomorphic.
 *
 * The "target schema" is supplied by the host (the entity being imported into) — the module is
 * entity-agnostic. Reusable mappings persist server-side (see backend/schema.ts savedMappings); the
 * mapping object here IS the persisted shape.
 */

export type TargetFieldType = 'string' | 'number' | 'integer' | 'boolean' | 'email' | 'date'

/** One target field the import can write to. */
export const TargetField = z.strictObject({
  /** The field key on the target entity (stable; what the upsert writes). */
  key: z.string().min(1),
  /** Human label shown in the mapping UI. */
  label: z.string().min(1),
  type: z.enum(['string', 'number', 'integer', 'boolean', 'email', 'date']),
  required: z.boolean().default(false),
  /** Part of the natural key used for idempotent upsert (≥1 field must be a key). */
  key_field: z.boolean().default(false),
})
export type TargetField = z.infer<typeof TargetField>

/** The target the import writes into — a named entity with its field catalog. */
export const TargetSchema = z.strictObject({
  /** Stable target id (the upsert namespace; e.g. "products"). */
  target: z.string().min(1),
  fields: z.array(TargetField).min(1),
})
export type TargetSchema = z.infer<typeof TargetSchema>

/** A column→field mapping: target field key → source header (or null = unmapped/skip). */
export const ColumnMapping = z.record(z.string(), z.string().nullable())
export type ColumnMapping = z.infer<typeof ColumnMapping>

/** The persisted, reusable mapping (saved server-side, keyed by name + target). */
export const SavedMapping = z.strictObject({
  name: z.string().min(1),
  target: z.string().min(1),
  mapping: ColumnMapping,
})
export type SavedMapping = z.infer<typeof SavedMapping>

/** The natural-key field keys of a target (used for idempotent upsert + duplicate detection). */
export function keyFields(schema: TargetSchema): string[] {
  return schema.fields.filter((f) => f.key_field).map((f) => f.key)
}

/** A raw, pre-validation record: target field key → source cell string (only mapped fields present). */
export type MappedRecord = Record<string, string>

/**
 * Apply a column mapping to a parsed table → one MappedRecord per data row. Unmapped target fields are
 * omitted; an unknown source header maps to '' (treated as missing downstream). Deterministic order.
 */
export function applyMapping(table: ParsedTable, mapping: ColumnMapping): MappedRecord[] {
  const headerIndex = new Map<string, number>()
  table.headers.forEach((header, i) => {
    if (!headerIndex.has(header)) headerIndex.set(header, i)
  })

  return table.rows.map((row) => {
    const record: MappedRecord = {}
    for (const [fieldKey, sourceHeader] of Object.entries(mapping)) {
      if (sourceHeader === null) continue
      const idx = headerIndex.get(sourceHeader)
      record[fieldKey] = idx === undefined ? '' : (row[idx] ?? '')
    }
    return record
  })
}

/**
 * Auto-suggest a mapping by case/whitespace-insensitive match of target field key OR label against
 * the source headers. A starting point the user confirms or overrides (capability "geführtes Mapping").
 */
export function suggestMapping(table: ParsedTable, schema: TargetSchema): ColumnMapping {
  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '')
  const byNorm = new Map<string, string>()
  for (const header of table.headers) {
    const n = norm(header)
    if (!byNorm.has(n)) byNorm.set(n, header)
  }
  const mapping: ColumnMapping = {}
  for (const field of schema.fields) {
    mapping[field.key] = byNorm.get(norm(field.key)) ?? byNorm.get(norm(field.label)) ?? null
  }
  return mapping
}
