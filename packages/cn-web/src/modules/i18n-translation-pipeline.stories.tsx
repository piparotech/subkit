import { useCallback, useMemo, useState } from 'react'

import {
  PUIBadge,
  PUIButton,
  PUICard,
  PUIProgressBar,
  PUISeparator,
  PUIText,
} from '@/components/ui'
import {
  type PoCatalog,
  type RunStatus,
  coverageOf,
  isUntranslated,
  parsePo,
  readMarker,
  runPipeline,
} from '@/lib/i18n-translation-pipeline'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Clock, Sparkles } from 'lucide-react'

import {
  DEMO_BATCH_SIZE,
  DEMO_LOCALES,
  DEMO_MAX_CHARS,
  type LocaleCatalog,
  createMockTranslator,
} from './mock-i18n-translation-pipeline'

/** Per-locale run policy: Spanish gets a tight character cap so the quota guard trips mid-run and the
 *  partial-progress-saved path is visible; the others run to completion. */
function maxCharsFor(locale: string): number | undefined {
  return locale === 'es' ? DEMO_MAX_CHARS : undefined
}

type LocaleState = {
  catalog: PoCatalog
  status: RunStatus | 'idle'
  running: boolean
  lastFilled: number
}

const STATUS_BADGE: Record<RunStatus, { label: string; variant: 'success' | 'warning' | 'info' }> =
  {
    complete: { label: 'Complete', variant: 'success' },
    'max-chars': { label: 'Character cap reached', variant: 'warning' },
    quota: { label: 'Provider quota reached', variant: 'info' },
  }

function initialState(po: string): LocaleState {
  return { catalog: parsePo(po), status: 'idle', running: false, lastFilled: 0 }
}

/** A single PO entry row: source on the left, its current translation on the right, tagged when the
 *  value carries a machine marker so the reviewer can tell human from machine output at a glance. */
function EntryRow({ catalog }: { catalog: PoCatalog }) {
  return (
    <ul className="flex flex-col">
      {catalog.entries.map((entry) => {
        const marker = readMarker(entry)
        const empty = isUntranslated(entry)
        return (
          <li
            className="border-border/60 flex items-baseline justify-between gap-6 border-b py-2 last:border-b-0"
            key={entry.msgid}
          >
            <PUIText className="text-muted-foreground shrink-0 font-mono" variant="caption1">
              {entry.msgid}
            </PUIText>
            <span className="flex items-center gap-2 text-right">
              {empty ? (
                <PUIText tone="subtle" variant="caption1">
                  not translated
                </PUIText>
              ) : (
                <PUIText variant="callout">{entry.msgstr}</PUIText>
              )}
              {marker ? (
                <PUIBadge variant="outline"># {marker}</PUIBadge>
              ) : !empty ? (
                <PUIBadge dot variant="secondary">
                  human
                </PUIBadge>
              ) : null}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function LocaleCard({ seed }: { seed: LocaleCatalog }) {
  const [state, setState] = useState<LocaleState>(() => initialState(seed.po))

  const coverage = useMemo(() => coverageOf(state.catalog), [state.catalog])
  const pct = Math.round(coverage.ratio * 100)
  const missing = coverage.untranslated

  const fill = useCallback(async () => {
    setState((s) => ({ ...s, running: true }))
    const result = await runPipeline({
      catalog: state.catalog,
      targetLocale: seed.locale,
      translator: createMockTranslator(),
      batchSize: DEMO_BATCH_SIZE,
      maxChars: maxCharsFor(seed.locale),
    })
    setState({
      catalog: result.catalog,
      status: result.status,
      running: false,
      lastFilled: result.filled,
    })
  }, [seed.locale, state.catalog])

  const badge = state.status === 'idle' ? null : STATUS_BADGE[state.status]

  return (
    <PUICard className="flex flex-col gap-4 p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <PUIText as="h3" className="font-semibold tracking-tight" variant="headline">
            {seed.name}
          </PUIText>
          <PUIText className="font-mono" tone="subtle" variant="caption1">
            {seed.locale}
          </PUIText>
        </div>
        {badge ? (
          <PUIBadge dot variant={badge.variant}>
            {badge.label}
          </PUIBadge>
        ) : null}
      </header>

      <PUIProgressBar
        label={
          <span className="flex items-center justify-between gap-4">
            <span>
              {coverage.translated} of {coverage.total} translated
            </span>
            <span className="text-muted-foreground tabular-nums">{pct}%</span>
          </span>
        }
        tone={pct === 100 ? 'success' : 'brand'}
        value={pct}
      />

      <EntryRow catalog={state.catalog} />

      <PUISeparator />

      <div className="flex items-center justify-between gap-4">
        <PUIText tone="muted" variant="footnote">
          {coverage.machine > 0 ? (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {coverage.machine} machine entries await native-speaker review
            </span>
          ) : missing > 0 ? (
            `${missing} empty ${missing === 1 ? 'entry' : 'entries'} to fill`
          ) : (
            'Fully translated by hand'
          )}
        </PUIText>
        <PUIButton
          addonStart={<Sparkles className="size-4" />}
          disabled={missing === 0}
          loading={state.running}
          onPress={fill}
          size="sm"
          variant={missing === 0 ? 'outline' : 'default'}
        >
          {missing === 0 ? 'Nothing to fill' : `Fill ${missing} missing`}
        </PUIButton>
      </div>

      {state.status === 'max-chars' && missing > 0 ? (
        <PUIText className="max-w-prose" tone="subtle" variant="caption1">
          The {DEMO_MAX_CHARS} character run cap was hit after {state.lastFilled} filled. Partial
          progress is saved, the rest waits for the next run. Real runs persist after every batch,
          so an abort loses at most one batch.
        </PUIText>
      ) : null}
    </PUICard>
  )
}

function I18nTranslationPipelineDemo() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <PUIText as="h2" className="tracking-tight" variant="title3">
          Fill missing translations
        </PUIText>
        <PUIText className="max-w-prose" tone="muted" variant="footnote">
          Three target catalogs against one English source. The Engine fills only empty entries with
          the injected translator, stamps each filled value with a <code># deepl</code> marker, and
          never touches the human translations already in French. Run a locale to watch its coverage
          close and the markers appear.
        </PUIText>
      </header>

      <div className="flex flex-col gap-4">
        {DEMO_LOCALES.map((seed) => (
          <LocaleCard key={seed.locale} seed={seed} />
        ))}
      </div>

      <PUIText className="max-w-prose" tone="subtle" variant="caption1">
        Spanish carries a deliberate {DEMO_MAX_CHARS} character run cap: the quota guard stops it
        cleanly with partial progress saved, the same NFR that protects a metered DeepL budget in
        production.
      </PUIText>
    </div>
  )
}

const seededDescription =
  `Automatically fill missing translations for whole locale sets via an injected DeepL or LLM ` +
  `translator: idempotent (only empty msgstr), machine markers for reviewer filtering, a quota ` +
  `guard, and batch-by-batch persistence. In-memory demo: an English source with three targets, ` +
  `German empty, French half human-translated, Spanish capped. Fill a locale to watch its coverage ` +
  `close, see the # deepl markers stamped on machine output while human entries stay untouched, and ` +
  `trip Spanish's character cap to see partial progress saved.`

const meta = {
  title: 'Modules/Translation Pipeline',
  component: I18nTranslationPipelineDemo,
  parameters: {
    layout: 'padded',
    docs: { description: { component: seededDescription } },
  },
} satisfies Meta<typeof I18nTranslationPipelineDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
