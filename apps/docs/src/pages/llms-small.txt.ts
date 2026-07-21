import { renderCorpus, smallEntries } from '@/lib/llms'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async () =>
  new Response(
    renderCorpus(
      'SubKit abridged documentation',
      'The smallest public context covering core concepts, security, and common mobile/backend integration paths.',
      await smallEntries(),
    ),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  )
