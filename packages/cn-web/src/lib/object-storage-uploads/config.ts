import { z } from 'zod'

/**
 * The `object-storage-uploads` module's `config.schema` — the contract for `modules[].config` in a
 * Blueprint. The typed, customer/cockpit-facing switch surface: the upload policy (allowed types,
 * max size), URL lifetimes, the key prefix, the orphan-cleanup window, and screen copy. Validated by
 * generator-core. Provider SECRETS (endpoint/keys) are NOT here — they are backend env (see
 * backend/config.ts), never in a Blueprint.
 */

/** The size/type policy the SERVER enforces before issuing any presigned URL. */
export const UploadLimits = z.strictObject({
  /** Allowed MIME types. `['*']` = any. Default: common image + PDF. */
  allowedContentTypes: z
    .array(z.string())
    .default(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  /** Max declared object size in bytes. Default 10 MiB. */
  maxSizeBytes: z
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
})
export type UploadLimits = z.infer<typeof UploadLimits>

/** How long the granted presigned URLs live (seconds). Kept short — a leaked URL self-expires. */
export const UploadUrlTtl = z.strictObject({
  /** Upload (PUT) URL lifetime. Default 5 min. */
  uploadSeconds: z.number().int().positive().max(86_400).default(300),
  /** Download (GET) URL lifetime. Default 5 min. */
  downloadSeconds: z.number().int().positive().max(86_400).default(300),
})
export type UploadUrlTtl = z.infer<typeof UploadUrlTtl>

/** Customer-editable copy (the Cockpit may edit these; see objectStorageUploadsConfigRights). */
export const UploadTexts = z.strictObject({
  title: z.string().default('Dateien'),
  uploadButton: z.string().default('Datei hochladen'),
  empty: z.string().default('Noch keine Dateien'),
  tooLarge: z.string().default('Die Datei überschreitet die zulässige Größe.'),
  typeNotAllowed: z.string().default('Dieser Dateityp ist nicht erlaubt.'),
  uploadFailed: z.string().default('Der Upload ist fehlgeschlagen. Bitte erneut versuchen.'),
})
export type UploadTexts = z.infer<typeof UploadTexts>

export const ObjectStorageUploadsConfig = z.strictObject({
  limits: UploadLimits.default(() => UploadLimits.parse({})),
  ttl: UploadUrlTtl.default(() => UploadUrlTtl.parse({})),
  /** Logical key prefix under the bucket (e.g. `uploads`). Objects live under `<prefix>/<owner>/…`. */
  keyPrefix: z.string().trim().max(120).default('uploads'),
  /** Age (hours) after which an un-completed (orphaned) pending object is swept. Default 24h. */
  orphanCleanupAfterHours: z.number().int().positive().max(8760).default(24),
  texts: UploadTexts.default(() => UploadTexts.parse({})),
})
export type ObjectStorageUploadsConfig = z.infer<typeof ObjectStorageUploadsConfig>

/**
 * Rights model ("wer darf bedienen") — per config path: `customer` = editable in the Cockpit,
 * `piparo` = piparo-only (security-/cost-relevant policy stays piparo-owned).
 */
export type EditableBy = 'piparo' | 'customer'
export const objectStorageUploadsConfigRights: Record<string, EditableBy> = {
  limits: 'piparo',
  ttl: 'piparo',
  keyPrefix: 'piparo',
  orphanCleanupAfterHours: 'piparo',
  texts: 'customer',
}

/** Parse + validate an object-storage-uploads module config (returns the Zod safeParse result). */
export function parseObjectStorageUploadsConfig(input: unknown) {
  return ObjectStorageUploadsConfig.safeParse(input)
}
