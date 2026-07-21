import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ site }) => {
  if (site === undefined) return new Response('Site URL is required', { status: 500 })
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n`,
    {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    },
  )
}
