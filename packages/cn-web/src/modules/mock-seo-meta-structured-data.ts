import {
  type ArticleInput,
  type Breadcrumb,
  type SeoConfig,
  type SeoPage,
  type SitemapEntry,
  resolveSeoConfig,
} from '@/lib/seo-meta-structured-data'

// In-memory seam for the SEO Engine demo. The platform module is host-supplied: the host injects the
// site config and the build iterates a page list to emit the sitemap + robots. Here both are seeded
// deterministically so the demo renders the same crawler-facing output on every load (the same story
// the QA snapshot would assert). No network, no filesystem.

/** The seeded site SEO config — a realistic piparo.tech setup the Engine inherits from. */
export const seededSeoConfig: SeoConfig = resolveSeoConfig({
  siteUrl: 'https://piparo.tech',
  siteName: 'piparo',
  defaultTitle: 'piparo — engineering-grade product studio',
  titleTemplate: '%s | piparo',
  defaultDescription:
    'piparo builds engineering-grade product platforms: native apps, web, and the shared module catalog behind them.',
  defaultImage: '/og/default.png',
  locale: 'de_DE',
  twitterCard: 'summary_large_image',
  twitterSite: '@piparotech',
  organization: {
    name: 'piparo GmbH',
    logoUrl: '/brand/logo-square.png',
    sameAs: ['https://www.linkedin.com/company/piparo', 'https://github.com/piparotech'],
  },
  robots: {
    index: true,
    disallow: ['/admin', '/api', '/preview'],
  },
})

/** A page the demo can preview head tags for. `kind` drives which JSON-LD builder the demo offers. */
export type DemoPage = {
  id: string
  label: string
  kind: 'home' | 'page' | 'article'
  page: SeoPage
  /** Breadcrumb trail for the BreadcrumbList node (home pages have none). */
  crumbs: Breadcrumb[]
  /** Article fields for the Article/BlogPosting node (article pages only). */
  article?: ArticleInput
}

/** Deterministic seeded pages, mirroring a small but real site (home, a landing page, a blog post). */
export const seededPages: DemoPage[] = [
  {
    id: 'home',
    label: 'Home',
    kind: 'home',
    page: { path: '/', rawTitle: true, ogType: 'website' },
    crumbs: [],
  },
  {
    id: 'modules',
    label: 'Module catalog',
    kind: 'page',
    page: {
      path: '/modules',
      title: 'Module catalog',
      description:
        'The reusable build units behind every piparo engagement: capabilities, offerings, and use cases.',
      ogType: 'website',
    },
    crumbs: [
      { name: 'Home', path: '/' },
      { name: 'Module catalog', path: '/modules' },
    ],
  },
  {
    id: 'article',
    label: 'Blog post',
    kind: 'article',
    page: {
      path: '/blog/isomorphic-seo-engine',
      title: 'One SEO Engine for build, server and tests',
      description:
        'Why we ship meta, sitemap, robots and JSON-LD from one pure, deterministic module that runs everywhere.',
      image: '/og/isomorphic-seo.png',
      ogType: 'article',
    },
    crumbs: [
      { name: 'Home', path: '/' },
      { name: 'Blog', path: '/blog' },
      { name: 'One SEO Engine for build, server and tests', path: '/blog/isomorphic-seo-engine' },
    ],
    article: {
      path: '/blog/isomorphic-seo-engine',
      headline: 'One SEO Engine for build, server and tests',
      description:
        'Why we ship meta, sitemap, robots and JSON-LD from one pure, deterministic module that runs everywhere.',
      image: '/og/isomorphic-seo.png',
      datePublished: '2026-06-18',
      dateModified: '2026-06-24',
      authorName: 'piparo engineering',
    },
  },
]

/** The seeded sitemap entries — the page list a build would walk to emit sitemap.xml. */
export const seededSitemapEntries: SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: 1.0, lastmod: '2026-06-24' },
  { path: '/modules', changefreq: 'weekly', priority: 0.8, lastmod: '2026-06-24' },
  { path: '/blog', changefreq: 'daily', priority: 0.7, lastmod: '2026-06-24' },
  {
    path: '/blog/isomorphic-seo-engine',
    changefreq: 'monthly',
    priority: 0.6,
    lastmod: '2026-06-24',
  },
  { path: '/preview/draft-pricing', changefreq: 'never', priority: 0.1, indexable: false },
]
