import { absoluteUrl } from './url'

// Sitemap Engine — renders a valid `sitemap.xml` from typed entries (capability AC: "Die Sitemap.xml
// listet alle indexierbaren Seiten"). Pure string generation: no filesystem, no host. Non-indexable
// entries are dropped here so the same `pages` list can drive both the meta `robots` tag and the
// sitemap from one source of truth. URLs are resolved + escaped; entries are emitted in a stable,
// de-duplicated order so the output is byte-reproducible for QA snapshots.

export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

export type SitemapEntry = {
  /** Path or absolute URL of the page. */
  path: string
  /** ISO 8601 date string (`YYYY-MM-DD` or full timestamp). Omitted when unknown. */
  lastmod?: string
  changefreq?: ChangeFreq
  /** 0.0–1.0 relative priority. Out-of-range values are clamped. */
  priority?: number
  /** When false the entry is excluded from the sitemap (mirrors a `noindex` page). */
  indexable?: boolean
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

/** Escape the five XML predefined entities for safe `<loc>`/attribute content. */
export function xmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char)
}

function clampPriority(priority: number): number {
  return Math.min(1, Math.max(0, priority))
}

/** Indexable entries resolved to absolute URLs, de-duplicated by URL, in input order. */
export function indexableUrls(siteUrl: string, entries: SitemapEntry[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of entries) {
    if (entry.indexable === false) continue
    const url = absoluteUrl(siteUrl, entry.path)
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push(url)
  }
  return out
}

/**
 * Render the complete `sitemap.xml` document. Indexable entries only, absolute + de-duplicated URLs,
 * stable order. Returns a string ready to serve with `Content-Type: application/xml`.
 */
export function buildSitemap(siteUrl: string, entries: SitemapEntry[]): string {
  const seen = new Set<string>()
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]

  for (const entry of entries) {
    if (entry.indexable === false) continue
    const url = absoluteUrl(siteUrl, entry.path)
    if (!url || seen.has(url)) continue
    seen.add(url)

    const parts = [`    <loc>${xmlEscape(url)}</loc>`]
    if (entry.lastmod) parts.push(`    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`)
    if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`)
    if (entry.priority !== undefined)
      parts.push(`    <priority>${clampPriority(entry.priority).toFixed(1)}</priority>`)
    lines.push('  <url>', ...parts, '  </url>')
  }

  lines.push('</urlset>')
  return `${lines.join('\n')}\n`
}
