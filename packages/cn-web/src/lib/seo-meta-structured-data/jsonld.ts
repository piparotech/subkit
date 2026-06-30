import type { SeoConfig } from './config'
import { absoluteUrl } from './url'

// JSON-LD Engine — builds VALID schema.org structured data PER PAGE TYPE (capability AC: "valides
// JSON-LD Schema Markup für diesen Typ" + "meldet keine Schema-Fehler" im Rich-Results-Test). One
// builder per type (Organization / WebSite / BreadcrumbList / Article / BlogPosting); each emits the
// minimal but Rich-Results-complete shape with the required properties, and only includes optional
// properties when present (no empty strings, no `null` — those are what trip the validator). Output is
// a plain object; `renderJsonLd` serializes it with sorted keys for byte-reproducible snapshots.

/** A schema.org node — `@context`/`@type` plus arbitrary typed properties. */
export type JsonLdNode = {
  '@context': 'https://schema.org'
  '@type': string
  [key: string]: unknown
}

/** Drop `undefined`/empty-string/empty-array values so the validator never sees a blank property. */
function compact<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue
    if (typeof value === 'string' && value.length === 0) continue
    if (Array.isArray(value) && value.length === 0) continue
    out[key] = value
  }
  return out as T
}

/**
 * `Organization` node — the site's publisher identity (logo + `sameAs` profiles). Render once,
 * typically in the site head / home page. Falls back to `siteName` when no org name is configured.
 */
export function organizationLd(config: SeoConfig): JsonLdNode {
  const name = config.organization.name || config.siteName
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    ...compact({
      name,
      url: config.siteUrl || undefined,
      logo: config.organization.logoUrl
        ? absoluteUrl(config.siteUrl, config.organization.logoUrl)
        : undefined,
      sameAs: config.organization.sameAs.filter((entry) => entry.length > 0),
    }),
  }
}

/**
 * `WebSite` node — enables the sitelinks search box and names the site. Emit once on the home page.
 * `searchUrlTemplate` (e.g. `https://site/search?q={search_term_string}`) adds the `SearchAction`.
 */
export function websiteLd(config: SeoConfig, searchUrlTemplate?: string): JsonLdNode {
  const name = config.siteName || config.organization.name
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    ...compact({
      name,
      url: config.siteUrl || undefined,
      potentialAction: searchUrlTemplate
        ? {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: searchUrlTemplate,
            },
            'query-input': 'required name=search_term_string',
          }
        : undefined,
    }),
  }
}

export type Breadcrumb = { name: string; path: string }

/** `BreadcrumbList` node — the trail to the current page, 1-indexed in order. */
export function breadcrumbLd(config: SeoConfig, crumbs: Breadcrumb[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(config.siteUrl, crumb.path),
    })),
  }
}

export type ArticleInput = {
  /** Canonical path or URL of the article. */
  path: string
  headline: string
  description?: string
  /** Absolute or site-relative hero image. */
  image?: string
  /** ISO 8601 publish date. */
  datePublished?: string
  /** ISO 8601 last-modified date; defaults to `datePublished`. */
  dateModified?: string
  authorName?: string
}

/**
 * `Article`/`BlogPosting` node — per-post structured data. `type` selects the schema.org subtype so a
 * blog post (`BlogPosting`) and a generic article (`Article`) get the right markup. The `publisher`
 * is the configured `Organization`; absent optional fields are omitted (Rich-Results-clean).
 */
export function articleLd(
  config: SeoConfig,
  article: ArticleInput,
  type: 'Article' | 'BlogPosting' = 'Article',
): JsonLdNode {
  const url = absoluteUrl(config.siteUrl, article.path)
  const publisherName = config.organization.name || config.siteName
  return {
    '@context': 'https://schema.org',
    '@type': type,
    ...compact({
      headline: article.headline,
      description: article.description,
      image: article.image ? absoluteUrl(config.siteUrl, article.image) : undefined,
      datePublished: article.datePublished,
      dateModified: article.dateModified ?? article.datePublished,
      mainEntityOfPage: url ? { '@type': 'WebPage', '@id': url } : undefined,
      author: article.authorName ? { '@type': 'Person', name: article.authorName } : undefined,
      publisher: publisherName
        ? compact({
            '@type': 'Organization',
            name: publisherName,
            logo: config.organization.logoUrl
              ? {
                  '@type': 'ImageObject',
                  url: absoluteUrl(config.siteUrl, config.organization.logoUrl),
                }
              : undefined,
          })
        : undefined,
    }),
  }
}

/** Recursively sort object keys so the serialized JSON-LD is byte-reproducible across runs. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

/**
 * Serialize a node (or array of nodes) to the JSON string for a `<script type="application/ld+json">`.
 * Keys are sorted for deterministic output; the result is JSON-safe (no HTML-escaping needed inside a
 * JSON-LD script element, but `<` is escaped to `<` to be safe against script-tag breakout).
 */
export function renderJsonLd(node: JsonLdNode | JsonLdNode[]): string {
  return JSON.stringify(sortKeys(node)).replace(/</g, '\\u003c')
}
