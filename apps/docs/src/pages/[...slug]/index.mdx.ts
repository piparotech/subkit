import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import { readFile } from 'node:fs/promises'

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection('docs', ({ data }) => !data.draft && !data.noindex)
  return entries.map((entry) => ({
    params: { slug: entry.id === 'index' ? undefined : entry.id },
    props: { entry },
  }))
}

export const GET: APIRoute = async ({ props }) => {
  const entry = props.entry
  if (typeof entry !== 'object' || entry === null || !('filePath' in entry)) {
    return new Response('Not found', { status: 404 })
  }
  const filePath = entry.filePath
  if (typeof filePath !== 'string') return new Response('Not found', { status: 404 })
  return new Response(await readFile(filePath, 'utf8'), {
    headers: { 'Content-Type': 'text/mdx; charset=utf-8' },
  })
}
