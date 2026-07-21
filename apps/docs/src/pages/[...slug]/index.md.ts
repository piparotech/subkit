import { renderDocsEntryAsMarkdown } from '@/lib/render-markdown'
import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection('docs', ({ data }) => !data.draft && !data.noindex)
  return entries.map((entry) => ({
    params: { slug: entry.id === 'index' ? undefined : entry.id },
    props: { entry },
  }))
}

export const GET: APIRoute = ({ props, site }) => {
  const entry = props.entry
  if (typeof entry !== 'object' || entry === null || !('body' in entry) || !('data' in entry)) {
    return new Response('Not found', { status: 404 })
  }
  const data = entry.data
  if (
    typeof data !== 'object' ||
    data === null ||
    !('title' in data) ||
    typeof data.title !== 'string'
  ) {
    return new Response('Invalid entry', { status: 500 })
  }
  const sourceUrl = entry.id === 'index' ? '/index.mdx' : `/${entry.id}/index.mdx`
  const source = site === undefined ? sourceUrl : new URL(sourceUrl, site).href
  const description =
    'description' in data && typeof data.description === 'string'
      ? `\ndescription: ${JSON.stringify(data.description)}`
      : ''
  const body = `---\ntitle: ${JSON.stringify(data.title)}${description}\n---\n\n# ${data.title}\n\n${renderDocsEntryAsMarkdown(entry)}\n\nSource: ${source}\n`
  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
