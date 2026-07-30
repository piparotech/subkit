import { invariants, markdownUrl, topicSets, visibleEntries } from '@/lib/llms'
import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ site }) => {
  if (site === undefined) return new Response('Site URL is required', { status: 500 })
  const entries = await visibleEntries()
  const lines = [
    '# SubKit',
    '',
    "> SubKit is the source of truth for product catalog, commerce, and access across mobile and web products. Apps name an entitlement and read SubKit's Effective Access decision; Apple, Google, and payment providers are verified inputs, never competing sources of truth.",
    '',
    '## Invariants an integration must never break',
    '',
    ...invariants.map((invariant) => `- ${invariant}`),
    '',
    '## Documentation sets',
    '',
    '- [Abridged documentation](/llms-small.txt)',
    '- [Complete documentation](/llms-full.txt)',
    ...Object.entries(topicSets).map(
      ([slug, set]) => `- [${set.title}](/llms-${slug}.txt): ${set.description}`,
    ),
    '',
    '## Pages',
    '',
    ...entries.map(
      (entry) =>
        `- [${entry.data.title}](${new URL(markdownUrl(entry), site).href})${entry.data.description ? ` — ${entry.data.description}` : ''}`,
    ),
    '',
  ]
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
