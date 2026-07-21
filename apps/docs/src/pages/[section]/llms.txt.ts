import { entriesForPrefixes, renderCorpus, visibleEntries } from '@/lib/llms'
import type { APIRoute, GetStaticPaths } from 'astro'

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await visibleEntries()
  const sections = new Set(
    entries.map((entry) => entry.id.split('/')[0]).filter((section) => section !== 'index'),
  )
  return [...sections].sort().map((section) => ({ params: { section } }))
}

export const GET: APIRoute = async ({ params }) => {
  const section = params.section
  if (section === undefined) return new Response('Not found', { status: 404 })
  const entries = await entriesForPrefixes([`${section}/`])
  if (entries.length === 0) return new Response('Not found', { status: 404 })
  return new Response(
    renderCorpus(
      `SubKit ${section} documentation`,
      `Published pages in the ${section} section.`,
      entries,
    ),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  )
}
