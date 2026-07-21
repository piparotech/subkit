import type { APIRoute } from 'astro'
import { renderCorpusMarkdown } from 'nimbus-docs'

export const GET: APIRoute = async () =>
  new Response(await renderCorpusMarkdown(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
