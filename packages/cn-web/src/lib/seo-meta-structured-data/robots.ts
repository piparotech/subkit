import type { SeoConfig } from './config'
import { absoluteUrl } from './url'

// robots.txt Engine — renders the directives a crawler reads first (capability AC: "die robots.txt
// verweist auf [die Sitemap]"). Pure string generation. Honors the site robots policy: when indexing
// is off (staging/preview) it emits a hard `Disallow: /`; otherwise it allows all and lists the
// per-config `Disallow` prefixes, then always points at the absolute sitemap URL.

export type RobotsOptions = {
  /** Sitemap path or absolute URL referenced by the `Sitemap:` line. Defaults to `/sitemap.xml`. */
  sitemapPath?: string
  /** User-agent the rules apply to. Defaults to the catch-all `*`. */
  userAgent?: string
}

/**
 * Render the complete `robots.txt` document. With `config.robots.index === false` the whole site is
 * disallowed (no sitemap shape leaks for a private build); otherwise everything is allowed except the
 * configured `Disallow` prefixes, and the absolute sitemap URL is always appended.
 */
export function buildRobotsTxt(config: SeoConfig, options: RobotsOptions = {}): string {
  const { sitemapPath = '/sitemap.xml', userAgent = '*' } = options
  const lines: string[] = [`User-agent: ${userAgent}`]

  if (!config.robots.index) {
    lines.push('Disallow: /')
  } else {
    lines.push('Allow: /')
    for (const path of config.robots.disallow) {
      const normalized = path.startsWith('/') ? path : `/${path}`
      lines.push(`Disallow: ${normalized}`)
    }
  }

  const sitemapUrl = absoluteUrl(config.siteUrl, sitemapPath)
  lines.push('', `Sitemap: ${sitemapUrl}`)

  return `${lines.join('\n')}\n`
}
