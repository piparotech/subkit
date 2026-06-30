import type { SeoConfig } from './config'
import { absoluteUrl } from './url'

// Meta-tag Engine — turns the site config + a per-page input into the COMPLETE, ordered set of head
// tag descriptors a crawler needs (capability AC: "vollständige Meta- und Open-Graph-/Twitter-Tags").
// Pure and host-agnostic: it returns plain descriptors, not JSX or HTML, so an Astro/Next/Expo-Router
// head can render them however it likes. The descriptors are deterministic (stable order) so snapshot
// tests and the Rich-Results/Lighthouse QA stay reproducible.

/** A `<title>` element. */
export type TitleTag = { tag: 'title'; text: string }
/** A `<meta name="…">` (description, robots, twitter:*). */
export type NameMetaTag = { tag: 'meta'; name: string; content: string }
/** A `<meta property="…">` (Open Graph `og:*`). */
export type PropertyMetaTag = { tag: 'meta'; property: string; content: string }
/** A `<link rel="…">` (canonical, alternate). */
export type LinkTag = { tag: 'link'; rel: string; href: string; hreflang?: string }

export type MetaTag = TitleTag | NameMetaTag | PropertyMetaTag | LinkTag

export type OgType = 'website' | 'article' | 'profile'

/** Per-page SEO input. Anything omitted falls back to the site config defaults. */
export type SeoPage = {
  /** Path or absolute URL of THIS page — used for the canonical link and OG `url`. */
  path: string
  title?: string
  description?: string
  /** Absolute or site-relative share image (OG/Twitter). */
  image?: string
  /** OG object type for the page (`website` for landing pages, `article` for posts). */
  ogType?: OgType
  /** Bypass `titleTemplate` and use `title` verbatim (e.g. the home page). */
  rawTitle?: boolean
  /** Per-page indexing override; `false` adds `noindex,nofollow`. Defaults to the site robots policy. */
  index?: boolean
  twitterCard?: SeoConfig['twitterCard']
  /** Locale alternates for `<link rel="alternate" hreflang>` (e.g. `[{ hreflang:'en', href:'/en' }]`). */
  alternates?: { hreflang: string; href: string }[]
}

/**
 * Resolve the effective page title. The site `titleTemplate` (`%s` placeholder) is applied to a
 * PAGE-supplied title; when the page has none we fall back to `defaultTitle` verbatim (it is already
 * the site's complete title, so re-templating it would double the brand). `rawTitle` opts a page out.
 */
export function resolveTitle(config: SeoConfig, page: SeoPage): string {
  if (!page.title) return config.defaultTitle || config.siteName
  if (page.rawTitle || !config.titleTemplate.includes('%s')) return page.title
  return config.titleTemplate.replace('%s', page.title)
}

/**
 * Build the full, ordered set of head tags for a page. Order is fixed: title, description, robots,
 * canonical, then Open Graph, then Twitter, then locale alternates — the order a reviewer expects and
 * what the snapshot tests assert. Empty values are skipped (no blank `content=""` tags).
 */
export function buildMetaTags(config: SeoConfig, page: SeoPage): MetaTag[] {
  const tags: MetaTag[] = []

  const title = resolveTitle(config, page)
  if (title) tags.push({ tag: 'title', text: title })

  const description = page.description ?? config.defaultDescription
  if (description) tags.push({ tag: 'meta', name: 'description', content: description })

  const indexable = page.index ?? config.robots.index
  tags.push({
    tag: 'meta',
    name: 'robots',
    content: indexable ? 'index,follow' : 'noindex,nofollow',
  })

  const canonical = absoluteUrl(config.siteUrl, page.path)
  if (canonical) tags.push({ tag: 'link', rel: 'canonical', href: canonical })

  const siteName = config.siteName || config.organization.name
  const image = page.image ? absoluteUrl(config.siteUrl, page.image) : config.defaultImage
  const ogType = page.ogType ?? 'website'

  if (title) tags.push({ tag: 'meta', property: 'og:title', content: title })
  if (description) tags.push({ tag: 'meta', property: 'og:description', content: description })
  tags.push({ tag: 'meta', property: 'og:type', content: ogType })
  if (canonical) tags.push({ tag: 'meta', property: 'og:url', content: canonical })
  if (siteName) tags.push({ tag: 'meta', property: 'og:site_name', content: siteName })
  if (config.locale) tags.push({ tag: 'meta', property: 'og:locale', content: config.locale })
  if (image) tags.push({ tag: 'meta', property: 'og:image', content: image })

  const card = page.twitterCard ?? config.twitterCard
  tags.push({ tag: 'meta', name: 'twitter:card', content: card })
  if (config.twitterSite)
    tags.push({ tag: 'meta', name: 'twitter:site', content: config.twitterSite })
  if (title) tags.push({ tag: 'meta', name: 'twitter:title', content: title })
  if (description) tags.push({ tag: 'meta', name: 'twitter:description', content: description })
  if (image) tags.push({ tag: 'meta', name: 'twitter:image', content: image })

  for (const alt of page.alternates ?? []) {
    tags.push({
      tag: 'link',
      rel: 'alternate',
      hreflang: alt.hreflang,
      href: absoluteUrl(config.siteUrl, alt.href),
    })
  }

  return tags
}

/** Convenience predicate: does the tag set declare every crawler-critical tag (title/desc/canonical/OG)? */
export function hasCompleteMetadata(tags: MetaTag[]): boolean {
  const has = (pred: (t: MetaTag) => boolean) => tags.some(pred)
  return (
    has((t) => t.tag === 'title') &&
    has((t) => t.tag === 'meta' && 'name' in t && t.name === 'description') &&
    has((t) => t.tag === 'link' && t.rel === 'canonical') &&
    has((t) => t.tag === 'meta' && 'property' in t && t.property === 'og:title') &&
    has((t) => t.tag === 'meta' && 'name' in t && t.name === 'twitter:card')
  )
}
