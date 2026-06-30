import { useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  PUIBadge,
  PUIButton,
  PUICard,
  PUISegmentedControl,
  PUISwitch,
  PUIText,
} from '@/components/ui'
import {
  type JsonLdNode,
  type MetaTag,
  articleLd,
  breadcrumbLd,
  buildMetaTags,
  buildRobotsTxt,
  buildSitemap,
  hasCompleteMetadata,
  organizationLd,
  renderJsonLd,
  resolveSeoConfig,
  websiteLd,
} from '@/lib/seo-meta-structured-data'

import { seededPages, seededSeoConfig, seededSitemapEntries } from './mock-seo-meta-structured-data'

type OutputView = 'meta' | 'jsonld' | 'sitemap' | 'robots'

const OUTPUT_OPTIONS = [
  { label: 'Meta tags', value: 'meta' },
  { label: 'JSON-LD', value: 'jsonld' },
  { label: 'sitemap.xml', value: 'sitemap' },
  { label: 'robots.txt', value: 'robots' },
] as const

/** The descriptor family a tag belongs to, used for the leading chip and grouping. */
function tagGroup(tag: MetaTag): { label: string; variant: 'secondary' | 'info' | 'outline' } {
  if (tag.tag === 'title') return { label: 'title', variant: 'secondary' }
  if (tag.tag === 'link') return { label: 'link', variant: 'outline' }
  if ('property' in tag) return { label: 'og', variant: 'info' }
  if (tag.name.startsWith('twitter:')) return { label: 'twitter', variant: 'info' }
  return { label: 'meta', variant: 'secondary' }
}

function tagKey(tag: MetaTag): string {
  if (tag.tag === 'title') return 'title'
  if (tag.tag === 'link') return `link:${tag.rel}${tag.hreflang ? `:${tag.hreflang}` : ''}`
  if ('property' in tag) return tag.property
  return tag.name
}

function tagValue(tag: MetaTag): string {
  if (tag.tag === 'title') return tag.text
  if (tag.tag === 'link') return tag.href
  return tag.content
}

function MetaTagsView({ tags }: { tags: MetaTag[] }) {
  return (
    <ul className="divide-border divide-y">
      {tags.map((tag, index) => {
        const group = tagGroup(tag)
        return (
          <li
            className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-2.5"
            key={`${tagKey(tag)}-${index}`}
          >
            <PUIBadge className="justify-self-start" variant={group.variant}>
              {group.label}
            </PUIBadge>
            <div className="min-w-0">
              <PUIText className="font-medium" variant="footnote">
                {tagKey(tag)}
              </PUIText>
              <PUIText className="block font-mono break-words" tone="muted" variant="footnote">
                {tagValue(tag)}
              </PUIText>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function CodeView({ value }: { value: string }) {
  return (
    <pre className="text-foreground bg-muted overflow-x-auto rounded-lg p-4 font-mono text-xs leading-relaxed">
      <code>{value}</code>
    </pre>
  )
}

function SeoMetaStructuredDataDemo() {
  const [pageId, setPageId] = useState(seededPages[0]!.id)
  const [view, setView] = useState<OutputView>('meta')
  const [indexable, setIndexable] = useState(seededSeoConfig.robots.index)

  const config = useMemo(
    () =>
      resolveSeoConfig({
        ...seededSeoConfig,
        robots: { ...seededSeoConfig.robots, index: indexable },
      }),
    [indexable],
  )

  const selected = seededPages.find((entry) => entry.id === pageId) ?? seededPages[0]!

  const metaTags = useMemo(() => buildMetaTags(config, selected.page), [config, selected])
  const complete = hasCompleteMetadata(metaTags)

  const jsonLdNodes = useMemo<JsonLdNode[]>(() => {
    const nodes: JsonLdNode[] = []
    if (selected.kind === 'home') {
      nodes.push(
        organizationLd(config),
        websiteLd(config, `${config.siteUrl}/search?q={search_term_string}`),
      )
    }
    if (selected.crumbs.length > 0) nodes.push(breadcrumbLd(config, selected.crumbs))
    if (selected.article) nodes.push(articleLd(config, selected.article, 'BlogPosting'))
    return nodes
  }, [config, selected])

  const sitemapXml = useMemo(
    () => buildSitemap(config.siteUrl, seededSitemapEntries),
    [config.siteUrl],
  )
  const robotsTxt = useMemo(() => buildRobotsTxt(config), [config])

  const indexableCount = seededSitemapEntries.filter((entry) => entry.indexable !== false).length

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Pick a page
          </PUIText>
          <PUIText tone="muted" variant="subheadline">
            Each page inherits the site defaults, then the Engine emits its crawler-facing output.
          </PUIText>
        </div>
        <PUISegmentedControl
          className="w-full"
          onValueChange={setPageId}
          options={seededPages.map((entry) => ({ label: entry.label, value: entry.id }))}
          value={pageId}
        />
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
          <span className="text-foreground">{config.siteUrl}</span>
          <span>{selected.page.path === '/' ? '' : selected.page.path}</span>
        </div>
      </section>

      <PUICard className="flex items-center justify-between gap-6 p-4">
        <div className="flex flex-col gap-0.5">
          <label htmlFor="seo-indexing">
            <PUIText className="font-medium" variant="subheadline">
              Site indexing
            </PUIText>
          </label>
          <PUIText tone="muted" variant="footnote">
            Off mirrors a staging build: robots blocks the whole site and pages emit noindex.
          </PUIText>
        </div>
        <PUISwitch id="seo-indexing" onValueChange={setIndexable} value={indexable} />
      </PUICard>

      <section className="flex flex-col gap-4">
        <PUISegmentedControl
          className="w-full"
          onValueChange={(next) => setView(next as OutputView)}
          options={OUTPUT_OPTIONS.map((option) => ({ ...option }))}
          value={view}
        />

        {view === 'meta' ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <PUIBadge variant={complete ? 'success' : 'warning'}>
                {complete ? 'Crawler-complete' : 'Missing critical tags'}
              </PUIBadge>
              <PUIText tone="muted" variant="footnote">
                {metaTags.length} tags, fixed order: title, description, robots, canonical, Open
                Graph, Twitter.
              </PUIText>
            </div>
            <MetaTagsView tags={metaTags} />
          </div>
        ) : null}

        {view === 'jsonld' ? (
          <div className="flex flex-col gap-3">
            {jsonLdNodes.length === 0 ? (
              <PUIText tone="muted" variant="footnote">
                No structured data for this page type.
              </PUIText>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {jsonLdNodes.map((node) => (
                    <PUIBadge key={String(node['@type'])} variant="info">
                      {String(node['@type'])}
                    </PUIBadge>
                  ))}
                </div>
                <CodeView
                  value={JSON.stringify(
                    JSON.parse(`[${jsonLdNodes.map((node) => renderJsonLd(node)).join(',')}]`),
                    null,
                    2,
                  )}
                />
              </>
            )}
          </div>
        ) : null}

        {view === 'sitemap' ? (
          <div className="flex flex-col gap-3">
            <PUIText tone="muted" variant="footnote">
              {indexableCount} of {seededSitemapEntries.length} seeded entries are indexable;
              noindex pages are dropped from the same source list.
            </PUIText>
            <CodeView value={sitemapXml} />
          </div>
        ) : null}

        {view === 'robots' ? (
          <div className="flex flex-col gap-3">
            <PUIText tone="muted" variant="footnote">
              {indexable
                ? 'Indexing on: allow all except the configured prefixes, then point at the sitemap.'
                : 'Indexing off: a hard Disallow for the whole site.'}
            </PUIText>
            <CodeView value={robotsTxt} />
          </div>
        ) : null}
      </section>

      <div className="border-border flex items-center justify-between border-t pt-4">
        <PUIText tone="subtle" variant="footnote">
          Same pure Engine the platform runs at build time, on the server and in tests.
        </PUIText>
        <PUIButton
          onPress={() => {
            const payload =
              view === 'meta'
                ? metaTags.map((tag) => `${tagKey(tag)}: ${tagValue(tag)}`).join('\n')
                : view === 'jsonld'
                  ? jsonLdNodes.map((node) => renderJsonLd(node)).join('\n')
                  : view === 'sitemap'
                    ? sitemapXml
                    : robotsTxt
            void navigator.clipboard?.writeText(payload)
          }}
          size="sm"
          variant="outline"
        >
          Copy output
        </PUIButton>
      </div>
    </div>
  )
}

const meta = {
  title: 'Modules/SEO, Sitemap, OG & Structured Data',
  component: SeoMetaStructuredDataDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Make a website discoverable and correctly interpretable for search engines and social sharing via complete meta/OG tags, sitemap and robots.txt, and per-page-type JSON-LD schema markup. In-memory demo: a seeded piparo.tech site config plus three pages (home, module catalog, blog post). Switch pages and the output view to inspect the meta tags, JSON-LD, sitemap.xml and robots.txt the pure Engine emits; toggle Site indexing to see the staging noindex variant.',
      },
    },
  },
} satisfies Meta<typeof SeoMetaStructuredDataDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
