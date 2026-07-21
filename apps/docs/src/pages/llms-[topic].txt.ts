import { entriesForPrefixes, renderCorpus, topicSets } from '@/lib/llms'
import type { APIRoute, GetStaticPaths } from 'astro'

export const getStaticPaths: GetStaticPaths = () =>
  Object.entries(topicSets).map(([topic, set]) => ({ params: { topic }, props: { set } }))

export const GET: APIRoute = async ({ props }) => {
  const set = props.set
  if (
    typeof set !== 'object' ||
    set === null ||
    !('title' in set) ||
    typeof set.title !== 'string' ||
    !('description' in set) ||
    typeof set.description !== 'string' ||
    !('prefixes' in set) ||
    !Array.isArray(set.prefixes) ||
    !set.prefixes.every((prefix: unknown) => typeof prefix === 'string')
  ) {
    return new Response('Not found', { status: 404 })
  }
  const entries = await entriesForPrefixes(set.prefixes)
  return new Response(renderCorpus(set.title, set.description, entries), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
