// Shared URL helpers — resolve per-page paths to the absolute, canonical form used by every surface
// (canonical link, OG `url`, sitemap `<loc>`, JSON-LD `@id`/`url`). Deterministic and pure: no
// `window`/`location` reference, so the same code runs at build time, on the server and in tests.

/** True for an already-absolute URL (has a scheme like `https:` or is protocol-relative `//`). */
export function isAbsoluteUrl(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')
}

/**
 * Resolve `pathOrUrl` against `siteUrl` (origin without trailing slash). Absolute inputs pass through
 * unchanged; relative inputs are joined with exactly one slash. With an empty `siteUrl` the relative
 * path is returned as-is (degraded but valid) — never throws.
 */
export function absoluteUrl(siteUrl: string, pathOrUrl: string): string {
  if (isAbsoluteUrl(pathOrUrl)) return pathOrUrl
  const origin = siteUrl.replace(/\/+$/, '')
  if (!origin) return pathOrUrl
  if (!pathOrUrl) return origin
  return `${origin}/${pathOrUrl.replace(/^\/+/, '')}`
}
