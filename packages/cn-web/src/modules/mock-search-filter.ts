// In-memory mock of the search-filter seam (the injected backend SearchClient) so the module is fully
// interactive in the showcase without a live Postgres-FTS endpoint. The Engine's backend variant
// normally talks to `GET /search` via fetch; here we replace that surface with a deterministic ranker
// over a seeded catalog, returning the exact SearchResponse shape (server-ranked hits + facet counts).
// Seeded: 12 articles across categories (sport/news/kultur) and tags. Mirrors the native showcase mock
// so both tell the same story; flip `failNetwork` to exercise the Shell's offline fallback path.
import {
  type FacetDef,
  type SearchClient,
  type SearchField,
  type SearchHitDto,
  type SearchResponse,
  applyFacets,
  createIndex,
  facetCounts,
} from '@/lib/search-filter'

/** One catalog row — the app-shaped payload the backend would project into `SearchHitDto.data`. */
export type Article = {
  id: string
  title: string
  summary: string
  category: string
  tags: string[]
}

/** Deterministic seed catalog (no network, no timers beyond a short fake latency). */
export const articles: Article[] = [
  {
    id: 'a1',
    title: 'Bundesliga: Derby endet remis',
    summary:
      'Ein intensives Stadtderby ohne Sieger: beide Teams treffen früh, dann hält die Abwehr.',
    category: 'sport',
    tags: ['fussball', 'bundesliga'],
  },
  {
    id: 'a2',
    title: 'Transfer-Hammer am Deadline Day',
    summary:
      'Last-Minute-Wechsel sorgt für Aufsehen: Rekordablöse kurz vor Transferschluss bestätigt.',
    category: 'sport',
    tags: ['fussball', 'transfer'],
  },
  {
    id: 'a3',
    title: 'Tennis: Comeback nach Verletzung',
    summary: 'Nach Monaten Pause gelingt das Comeback im ersten Satz souverän, danach wird es eng.',
    category: 'sport',
    tags: ['tennis'],
  },
  {
    id: 'a4',
    title: 'Haushalt 2027 im Bundestag beschlossen',
    summary:
      'Das Parlament verabschiedet den Etat nach langer Debatte; Schwerpunkt Bildung und Digitales.',
    category: 'news',
    tags: ['politik', 'wirtschaft'],
  },
  {
    id: 'a5',
    title: 'Inflation sinkt den dritten Monat',
    summary:
      'Die Teuerung gibt weiter nach: Energiepreise stabilisieren sich, Lebensmittel bleiben teuer.',
    category: 'news',
    tags: ['wirtschaft'],
  },
  {
    id: 'a6',
    title: 'Neue Bahnstrecke eröffnet',
    summary:
      'Die Schnellverbindung verkürzt die Fahrzeit deutlich und entlastet die Autobahn im Pendelverkehr.',
    category: 'news',
    tags: ['mobilitaet', 'politik'],
  },
  {
    id: 'a7',
    title: 'Filmfestival kürt Gewinner',
    summary:
      'Die Jury vergibt den Hauptpreis an ein leises Drama; das Publikum feiert eine Komödie.',
    category: 'kultur',
    tags: ['film'],
  },
  {
    id: 'a8',
    title: 'Ausstellung: Licht und Raum',
    summary:
      'Eine immersive Schau spielt mit Spiegeln und Projektionen; Tickets sind bereits knapp.',
    category: 'kultur',
    tags: ['kunst'],
  },
  {
    id: 'a9',
    title: 'Konzertreihe startet im Herbst',
    summary:
      'Klassik trifft Elektronik: ein Orchester kooperiert mit Produzentinnen der Clubszene.',
    category: 'kultur',
    tags: ['musik'],
  },
  {
    id: 'a10',
    title: 'Marathon-Weltrekord verpasst',
    summary:
      'Bei idealem Wetter fehlten am Ende nur Sekunden zur Bestmarke; die Zielzeit begeistert dennoch.',
    category: 'sport',
    tags: ['laufen'],
  },
  {
    id: 'a11',
    title: 'Startup sammelt Millionen ein',
    summary:
      'Eine Finanzierungsrunde bringt frisches Kapital; das Team will international expandieren.',
    category: 'news',
    tags: ['wirtschaft', 'tech'],
  },
  {
    id: 'a12',
    title: 'Bundesliga-Vorschau zum Spieltag',
    summary:
      'Die Topspiele im Überblick: Tabellenführer empfängt den Verfolger, Abstiegskampf spitzt sich zu.',
    category: 'sport',
    tags: ['fussball', 'bundesliga'],
  },
]

/** Title outranks summary, matching the native mock so both showcases rank identically. */
export const searchFields: SearchField<Article>[] = [
  { get: (a) => a.title, weight: 2 },
  { get: (a) => a.summary, weight: 1 },
]

export const facetDefs: FacetDef<Article>[] = [
  { key: 'category', get: (a) => a.category },
  { key: 'tag', get: (a) => a.tags },
]

const delay = (ms = 140) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * A deterministic, offline backend SearchClient — server-ranked hits + facet counts over the seeded
 * catalog. Mirrors the real `GET /search` contract: text-ranked, faceted, capped, totals reported.
 * Set `failNetwork` to simulate an unreachable endpoint so the Shell exercises its offline fallback.
 */
export function createMockSearchClient(opts: { failNetwork?: boolean } = {}): SearchClient {
  const index = createIndex(articles, { fields: searchFields, maxResults: 50 })

  return {
    async search(request) {
      await delay()
      if (opts.failNetwork) throw new Error('NETWORK_UNREACHABLE')

      const ranked = index.search(request.query)
      const selection = request.facets ?? {}
      const faceted = applyFacets(
        ranked.map((h) => h.item),
        facetDefs,
        selection,
      )
      const scoreOf = new Map(ranked.map((h) => [h.item, h.score] as const))
      const limit = request.limit ?? 50
      const hits: SearchHitDto[] = faceted.slice(0, limit).map((item) => ({
        id: item.id,
        score: scoreOf.get(item) ?? 0,
        data: { ...item },
      }))

      const counts = facetCounts(faceted, facetDefs, selection)
      const facets: SearchResponse['facets'] = {}
      for (const [key, perValue] of Object.entries(counts)) facets[key] = perValue

      return { hits, total: faceted.length, facets }
    },
  }
}
