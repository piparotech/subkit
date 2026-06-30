// csv-import-ingest — guided data/CSV import + migration (capability csv-import-ingest; 1:1 module).
// The import is entity-agnostic: the host declares the target schema in config; rows are written by
// idempotent upsert keyed by the verified auth subject plus the row's natural-key hash (no IDOR, no
// duplicates on re-import). The pure parse, map, validate and preview steps run client-side AND
// server-side. src/ (parser + schemas + client) is the Engine vendored into the showcase; backend/
// and the RN Shell stay in the platform module.
export * from './config'
export * from './parse'
export * from './mapping'
export * from './validate'
export * from './client'
