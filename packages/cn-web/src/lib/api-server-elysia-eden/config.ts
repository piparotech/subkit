import { z } from 'zod'

/**
 * The `api-server-elysia-eden` module's `config.schema` — the typed switch surface for the API
 * server itself: which browser origins may call it, whether the OpenAPI contract is exposed (and
 * under what title/version), and the pagination guardrails the list route enforces. The route I/O
 * schemas (body/query/params) are NOT config — they live in the contract (`./contract`) so they
 * drive validation, OpenAPI and the typed client from one source.
 */

/** OpenAPI publication policy — the generated contract that mirrors the live routes (AC3). */
export const OpenApiConfig = z.strictObject({
  /** Expose the generated OpenAPI document + UI. Turn off in hardened deployments. */
  enabled: z.boolean().default(true),
  /** Document title shown in the spec + UI. */
  title: z.string().min(1).default('piparo API'),
  /** Document version (semver-ish free string) shown in the spec. */
  version: z.string().min(1).default('1.0.0'),
  /** Route the spec UI + JSON mount under (joined by the plugin: `<path>` UI, `<path>/json` spec). */
  path: z.string().startsWith('/').default('/openapi'),
})
export type OpenApiConfig = z.infer<typeof OpenApiConfig>

/** Pagination guardrails for the cursor-paged list route (keeps an unbounded `limit` off the DB). */
export const PaginationConfig = z.strictObject({
  /** Page size used when the caller sends no `limit`. */
  defaultLimit: z.number().int().positive().default(20),
  /** Hard upper bound — a `limit` above this is rejected as a 4xx (AC1), never silently clamped. */
  maxLimit: z.number().int().positive().default(100),
})
export type PaginationConfig = z.infer<typeof PaginationConfig>

export const ApiServerConfig = z.strictObject({
  /**
   * Allowed browser origins for CORS. `null` = same-origin only (no cross-origin browser caller);
   * native clients send no Origin and are unaffected either way.
   */
  corsOrigins: z.array(z.string().url()).nullable().default(null),
  openapi: OpenApiConfig.default(() => OpenApiConfig.parse({})),
  pagination: PaginationConfig.default(() => PaginationConfig.parse({})),
})
export type ApiServerConfig = z.infer<typeof ApiServerConfig>

/** Parse + validate an api-server-elysia-eden module config (returns the Zod safeParse result). */
export function parseApiServerConfig(input: unknown) {
  return ApiServerConfig.safeParse(input)
}
