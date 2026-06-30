// The `seo-meta-structured-data` module config — the site-wide SEO defaults every page inherits and
// overrides per page. Distinct from `web-analytics-vitals` (runtime tracking): this is the
// build/SSR-time discoverability layer (meta/OG/Twitter, sitemap, robots, JSON-LD). Values are
// supplied by the host per site/environment; `seoConfigRights` declares who may edit each path
// (piparo = platform-owned defaults, customer = per-site/brand-owned content).
//
// Vendored into the web showcase: the platform Engine validates this with zod; here we keep the same
// shape, defaults and `parseSeoConfig` contract via a tiny dependency-free resolver so the showcase
// stays self-contained.

export type OrganizationConfig = {
  /** Legal/brand name for the `Organization` JSON-LD and the OG `site_name`. */
  name: string
  /** Absolute logo URL for the `Organization` JSON-LD (square, >=112px recommended). */
  logoUrl: string
  /** Social/profile URLs emitted as `sameAs` on the `Organization` node. */
  sameAs: string[]
}

export type RobotsConfig = {
  /** Allow indexing site-wide. `false` emits a global `Disallow: /` (staging/preview). */
  index: boolean
  /** Extra `Disallow` path prefixes for the catch-all user-agent (e.g. `/admin`, `/api`). */
  disallow: string[]
}

export type SeoConfig = {
  /**
   * Canonical site origin WITHOUT a trailing slash (e.g. `https://piparo.tech`). All canonical URLs,
   * OG URLs, the sitemap and robots' `Sitemap:` line are resolved against it. Required for absolute
   * URLs — an empty value keeps paths relative (degraded but valid).
   */
  siteUrl: string
  /** Default brand name (OG `site_name`, fallback `Organization.name`). */
  siteName: string
  /** Title used when a page supplies none. */
  defaultTitle: string
  /**
   * Template applied to per-page titles. `%s` is the page title; the result is the `<title>` and OG
   * title. A page may opt out of the template (see `buildMetaTags`).
   */
  titleTemplate: string
  /** Description used when a page supplies none. */
  defaultDescription: string
  /** Absolute default share image (OG/Twitter) when a page supplies none. */
  defaultImage: string
  /** BCP-47 locale for the OG `locale` and `<html lang>` hint (e.g. `de_DE`). */
  locale: string
  /** Twitter card type for pages that do not override it. */
  twitterCard: 'summary' | 'summary_large_image'
  /** `@handle` of the site's Twitter/X account (emitted as `twitter:site`). */
  twitterSite: string
  organization: OrganizationConfig
  robots: RobotsConfig
}

export type SeoConfigInput = {
  siteUrl?: string
  siteName?: string
  defaultTitle?: string
  titleTemplate?: string
  defaultDescription?: string
  defaultImage?: string
  locale?: string
  twitterCard?: SeoConfig['twitterCard']
  twitterSite?: string
  organization?: Partial<OrganizationConfig>
  robots?: Partial<RobotsConfig>
}

export type EditableBy = 'piparo' | 'customer'

/** Every config path mapped to its owner (piparo platform default vs customer/brand-owned). */
export const seoConfigRights: Record<string, EditableBy> = {
  siteUrl: 'customer',
  siteName: 'customer',
  defaultTitle: 'customer',
  titleTemplate: 'customer',
  defaultDescription: 'customer',
  defaultImage: 'customer',
  locale: 'customer',
  twitterCard: 'piparo',
  twitterSite: 'customer',
  'organization.name': 'customer',
  'organization.logoUrl': 'customer',
  'organization.sameAs': 'customer',
  'robots.index': 'piparo',
  'robots.disallow': 'piparo',
}

/**
 * Resolve a partial input into a fully defaulted `SeoConfig`. Mirrors the platform zod schema's
 * defaults and its `siteUrl` transform (trailing slashes stripped) so the showcase output matches the
 * Engine byte-for-byte. Never throws.
 */
export function resolveSeoConfig(input: SeoConfigInput = {}): SeoConfig {
  return {
    siteUrl: (input.siteUrl ?? '').replace(/\/+$/, ''),
    siteName: input.siteName ?? '',
    defaultTitle: input.defaultTitle ?? '',
    titleTemplate: input.titleTemplate ?? '%s',
    defaultDescription: input.defaultDescription ?? '',
    defaultImage: input.defaultImage ?? '',
    locale: input.locale ?? 'de_DE',
    twitterCard: input.twitterCard ?? 'summary_large_image',
    twitterSite: input.twitterSite ?? '',
    organization: {
      name: input.organization?.name ?? '',
      logoUrl: input.organization?.logoUrl ?? '',
      sameAs: input.organization?.sameAs ?? [],
    },
    robots: {
      index: input.robots?.index ?? true,
      disallow: input.robots?.disallow ?? [],
    },
  }
}

/** Safe-parse contract kept compatible with the platform Engine (`{ success, data }`). */
export function parseSeoConfig(input: SeoConfigInput = {}): { success: true; data: SeoConfig } {
  return { success: true, data: resolveSeoConfig(input) }
}
