import { useEffect, useMemo, useRef, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Search, WifiOff } from 'lucide-react'

import { PUIBadge, PUIEmptyState, PUIInput, PUISpinner, PUISwitch, PUIText } from '@/components/ui'
import {
  type FacetSelection,
  type SearchClient,
  type SearchResponse,
  createIndex,
  facetCounts,
  hasActiveFacets,
  toggleFacet,
} from '@/lib/search-filter'

import {
  type Article,
  articles,
  createMockSearchClient,
  facetDefs,
  searchFields,
} from './mock-search-filter'

const DEBOUNCE_MS = 200

type FacetGroup = { key: string; label: string; values: { value: string; label: string }[] }

const facetGroups: FacetGroup[] = [
  {
    key: 'category',
    label: 'Ressort',
    values: [
      { value: 'sport', label: 'Sport' },
      { value: 'news', label: 'News' },
      { value: 'kultur', label: 'Kultur' },
    ],
  },
  {
    key: 'tag',
    label: 'Themen',
    values: [
      { value: 'fussball', label: 'Fußball' },
      { value: 'bundesliga', label: 'Bundesliga' },
      { value: 'wirtschaft', label: 'Wirtschaft' },
      { value: 'politik', label: 'Politik' },
    ],
  },
]

type ResultRow = { item: Article; score: number }
type Source = 'backend' | 'offline'

/** Project a SearchResponse back onto the seeded catalog so the list keeps its typed Article shape. */
function rowsFromResponse(response: SearchResponse): ResultRow[] {
  const byId = new Map(articles.map((article) => [article.id, article] as const))
  return response.hits.flatMap((hit) => {
    const item = byId.get(hit.id)
    return item ? [{ item, score: hit.score }] : []
  })
}

/** The local fuzzy index is the offline fallback the Shell runs when the backend is unreachable. */
function searchOffline(query: string, selection: FacetSelection): SearchResponse {
  const index = createIndex(articles, { fields: searchFields, maxResults: 50 })
  const ranked = index.search(query)
  const passing = ranked.filter((hit) =>
    facetDefs.every((def) => {
      const selected = selection[def.key]
      if (!selected?.length) return true
      const raw = def.get(hit.item)
      const values = raw == null ? [] : Array.isArray(raw) ? raw : [raw]
      return values.some((value) => selected.includes(value))
    }),
  )
  const counts = facetCounts(
    passing.map((hit) => hit.item),
    facetDefs,
    selection,
  )
  return {
    hits: passing.map((hit) => ({ id: hit.item.id, score: hit.score, data: { ...hit.item } })),
    total: passing.length,
    facets: counts,
  }
}

function FacetChip({
  label,
  count,
  active,
  onToggle,
}: {
  label: string
  count: number
  active: boolean
  onToggle: () => void
}) {
  const disabled = count === 0 && !active
  return (
    <button
      aria-pressed={active}
      className={[
        'text-footnote inline-flex min-h-9 items-center gap-2 rounded-full border px-3 transition-colors',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:border-ring',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      ].join(' ')}
      disabled={disabled}
      onClick={onToggle}
      type="button"
    >
      <span className="font-medium">{label}</span>
      <span className={active ? 'text-primary-foreground/80' : 'text-muted-foreground'}>
        {count}
      </span>
    </button>
  )
}

function ResultCard({ item, score }: ResultRow) {
  return (
    <li className="border-border flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <PUIText className="font-medium" variant="headline">
          {item.title}
        </PUIText>
        <PUIBadge variant="outline">{score.toFixed(2)}</PUIBadge>
      </div>
      <PUIText className="max-w-prose" tone="muted" variant="subheadline">
        {item.summary}
      </PUIText>
      <div className="flex flex-wrap items-center gap-2">
        <PUIBadge variant="secondary">{item.category}</PUIBadge>
        {item.tags.map((tag) => (
          <PUIText className="font-mono" key={tag} tone="subtle" variant="caption2">
            #{tag}
          </PUIText>
        ))}
      </div>
    </li>
  )
}

function SearchFilterDemo() {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selection, setSelection] = useState<FacetSelection>({})
  const [backendDown, setBackendDown] = useState(false)
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [source, setSource] = useState<Source>('backend')
  const [loading, setLoading] = useState(false)
  const requestSeq = useRef(0)

  // The backend variant talks to an in-memory SearchClient; failNetwork drives the offline fallback.
  const client = useMemo<SearchClient>(
    () => createMockSearchClient({ failNetwork: backendDown }),
    [backendDown],
  )

  // Debounce protects the backend and smooths typing, exactly as the module's config.debounceMs does.
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query), DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [query])

  useEffect(() => {
    const seq = ++requestSeq.current
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the in-flight request before the async search resolves; cleared in .finally
    setLoading(true)
    let active = true
    void client
      .search({ query: debounced, facets: selection })
      .then((result) => {
        if (!active || seq !== requestSeq.current) return
        setResponse(result)
        setSource('backend')
      })
      .catch(() => {
        if (!active || seq !== requestSeq.current) return
        setResponse(searchOffline(debounced, selection))
        setSource('offline')
      })
      .finally(() => {
        if (active && seq === requestSeq.current) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [client, debounced, selection])

  const rows = response ? rowsFromResponse(response) : []
  const counts = response?.facets ?? {}
  const filtersActive = hasActiveFacets(selection)

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <PUIInput
            addonEnd={
              loading ? (
                <PUISpinner size="sm" tone="muted" />
              ) : (
                <Search aria-hidden className="text-muted-foreground mr-2 h-4 w-4" />
              )
            }
            aria-label="Artikel durchsuchen"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Artikel durchsuchen …"
            value={query}
          />
          <PUIText className="mt-1.5 max-w-prose" tone="subtle" variant="caption1">
            Fuzzy, diacritic-folding, debounced 200 ms. Title outranks summary. Try
            <span className="font-mono"> bundesliga</span>,
            <span className="font-mono"> inflaton</span> (typo), or
            <span className="font-mono"> licht raum</span>.
          </PUIText>
        </div>

        {facetGroups.map((group) => (
          <div className="flex flex-col gap-2.5" key={group.key}>
            <PUIText className="font-medium" tone="muted" variant="footnote">
              {group.label}
            </PUIText>
            <div className="flex flex-wrap gap-2">
              {group.values.map(({ value, label }) => (
                <FacetChip
                  active={(selection[group.key] ?? []).includes(value)}
                  count={counts[group.key]?.[value] ?? 0}
                  key={value}
                  label={label}
                  onToggle={() => setSelection((prev) => toggleFacet(prev, group.key, value))}
                />
              ))}
            </div>
          </div>
        ))}

        {filtersActive ? (
          <button
            className="text-primary text-footnote focus-visible:ring-ring self-start rounded-md font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            onClick={() => setSelection({})}
            type="button"
          >
            Filter zurücksetzen
          </button>
        ) : null}

        <PUISwitch
          label="Backend nicht erreichbar"
          onValueChange={setBackendDown}
          value={backendDown}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            {response?.total ?? 0} Treffer
          </PUIText>
          {source === 'offline' ? (
            <PUIBadge dot icon={<WifiOff className="h-3 w-3" />} variant="warning">
              Offline, lokale Suche
            </PUIBadge>
          ) : (
            <PUIText tone="subtle" variant="caption2">
              nach Relevanz sortiert
            </PUIText>
          )}
        </div>

        {rows.length === 0 ? (
          <PUIEmptyState
            description="Versuche einen anderen Suchbegriff oder setze die Filter zurück."
            icon={<Search className="text-muted-foreground h-6 w-6" />}
            title="Keine Treffer"
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <ResultCard item={row.item} key={row.item.id} score={row.score} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const meta = {
  title: 'Modules/Search & Filter',
  component: SearchFilterDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Search and filter content by full text, provider-neutral, on the isomorphic search-filter Engine (a dependency-free fuzzy ranker plus faceting) the platform runs client side or against a Postgres-FTS endpoint. In-memory demo: 12 seeded articles across three categories and several tags, queried through a mock backend SearchClient that returns server-ranked hits and live facet counts. Type to see debounced relevance ranking (including diacritic folding and typo-tolerant matches), toggle category and tag facets to narrow the list, and flip "Backend nicht erreichbar" to watch the Shell fall back to the local offline index.',
      },
    },
  },
} satisfies Meta<typeof SearchFilterDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
