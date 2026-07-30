import { renderDocsEntryAsMarkdown } from '@/lib/render-markdown'
import type { CollectionEntry } from 'astro:content'
import { getCollection } from 'astro:content'

export const invariants = [
  'SubKit is the source of truth for Catalog, Commerce, and Access.',
  'Access always follows: Access Source -> Access Pool -> Reservation/Allocation -> Entitlement Grant.',
  'Apps name entitlements, never subscription, plan, package, or store-product IDs.',
  'Mobile apps use only public app-bound SDK keys. Server keys belong only in trusted backends.',
  'A mobile installation ID is generated once, persisted locally, and reused on every launch.',
  'Only the Effective Access decision (`access.state === granted`) unlocks access; apps never combine raw entitlement and device fields.',
  'Store purchases unlock access only after provider verification and a granted Effective Access decision.',
  'Mutations require the documented capability, an idempotency key, and an audit reason.',
  'Store reads may run automatically; store writes require preview, explicit confirmation, apply, then verify.',
] as const

export const topicSets = {
  mobile: {
    title: 'SubKit mobile documentation',
    description: 'Expo SDK setup, offerings, purchases, restore, and offline access.',
    prefixes: ['expo/'],
  },
  backend: {
    title: 'SubKit backend documentation',
    description: 'Node SDK, server auth, customers, contracts, payments, and access capacity.',
    prefixes: ['node/'],
  },
  concepts: {
    title: 'SubKit concepts',
    description: 'Source of truth, catalog, commerce, and the access model.',
    prefixes: ['concepts/'],
  },
  api: {
    title: 'SubKit API reference',
    description: 'Runtime and server APIs, capabilities, contracts, and errors.',
    prefixes: ['reference/'],
  },
  operations: {
    title: 'SubKit operations',
    description: 'Store setup, security, go-live, and troubleshooting.',
    prefixes: ['stores/', 'operations/'],
  },
} as const

const smallIds = new Set([
  'index',
  'start/quickstart',
  'start/choose-an-integration',
  'concepts/access-model',
  'concepts/source-of-truth',
  'expo/overview',
  'expo/configuration',
  'expo/purchases',
  'expo/entitlements',
  'node/overview',
  'operations/security',
])

export async function visibleEntries(): Promise<CollectionEntry<'docs'>[]> {
  const entries = await getCollection('docs', ({ data }) => !data.draft && !data.noindex)
  return entries.sort((left, right) => left.id.localeCompare(right.id))
}

export async function entriesForPrefixes(prefixes: readonly string[]) {
  return (await visibleEntries()).filter((entry) =>
    prefixes.some((prefix) => entry.id.startsWith(prefix)),
  )
}

export async function smallEntries() {
  return (await visibleEntries()).filter((entry) => smallIds.has(entry.id))
}

export function markdownUrl(entry: CollectionEntry<'docs'>) {
  return entry.id === 'index' ? '/index.md' : `/${entry.id}/index.md`
}

export function renderCorpus(
  title: string,
  description: string,
  entries: CollectionEntry<'docs'>[],
) {
  const sections = entries.map((entry) => {
    const descriptionLine = entry.data.description ? `\n> ${entry.data.description}\n` : ''
    return `# ${entry.data.title}\n${descriptionLine}\n${renderDocsEntryAsMarkdown(entry).trim()}`
  })
  return [
    `# ${title}`,
    '',
    description,
    '',
    '## Invariants an integration must never break',
    '',
    ...invariants.map((invariant) => `- ${invariant}`),
    '',
    ...sections,
    '',
  ].join('\n')
}
