import { useCallback, useMemo, useState } from 'react'

import { PUIBadge, PUIButton, PUICard, PUISeparator, PUIText } from '@/components/ui'
import {
  type LocaleDescriptor,
  type LocalePreference,
  isRtlLocale,
  loadLocalePreference,
  pickInitialLocale,
  resolveMessage,
  saveLocalePreference,
} from '@/lib/i18n-lingui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CornerDownLeft, Languages } from 'lucide-react'

import {
  CATALOGS,
  DEVICE_PREFERENCES,
  FALLBACK_LOCALE,
  MESSAGE_IDS,
  MOCK_PERSIST_KEY,
  RETURNING_VISITOR,
  SOURCE_CATALOG,
  SOURCE_LOCALE,
  SUPPORTED_CODES,
  SUPPORTED_LOCALES,
  createMockPreferenceStorage,
} from './mock-i18n-lingui'

/** Where each rendered string came from, so the fallback chain is visible rather than implied. */
type Origin = 'translated' | 'source'

function resolveLine(id: string, locale: string): { text: string; origin: Origin } {
  const messages = CATALOGS[locale] ?? {}
  const text = resolveMessage({ id, messages, sourceMessages: SOURCE_CATALOG })
  const translated = (messages[id] ?? '').length > 0
  return { text, origin: translated ? 'translated' : 'source' }
}

function LocaleButton({
  locale,
  selected,
  onSelect,
}: {
  locale: LocaleDescriptor
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      aria-pressed={selected}
      className="focus-visible:ring-ring border-border bg-card hover:bg-accent aria-pressed:border-primary aria-pressed:bg-accent flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
      lang={locale.code}
      onClick={onSelect}
      type="button"
    >
      <PUIText className={selected ? 'font-semibold' : 'font-medium'} variant="subheadline">
        {locale.nativeName}
      </PUIText>
      <PUIText className="font-mono" tone="subtle" variant="caption1">
        {locale.code}
      </PUIText>
    </button>
  )
}

/** One resolved string in the preview, tagged with whether it was translated or fell back to source. */
function PreviewLine({ label, text, origin }: { label: string; text: string; origin: Origin }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <PUIText variant="callout">{text}</PUIText>
        <PUIText tone="subtle" variant="caption2">
          {label}
        </PUIText>
      </div>
      {origin === 'source' ? (
        <PUIBadge variant="warning">Source fallback</PUIBadge>
      ) : (
        <PUIBadge variant="outline">Translated</PUIBadge>
      )}
    </div>
  )
}

function I18nLinguiDemo() {
  const storage = useMemo(
    () => createMockPreferenceStorage({ [MOCK_PERSIST_KEY]: RETURNING_VISITOR }),
    [],
  )

  const [preference, setPreference] = useState<LocalePreference>(() =>
    loadLocalePreference(storage, MOCK_PERSIST_KEY, SUPPORTED_CODES),
  )
  const [negotiatedFrom, setNegotiatedFrom] = useState<string | null>(null)

  const activeLocale = preference.locale ?? FALLBACK_LOCALE

  const choose = useCallback(
    (locale: string) => {
      const next: LocalePreference = { locale }
      setPreference(next)
      saveLocalePreference(storage, MOCK_PERSIST_KEY, next)
      setNegotiatedFrom(null)
    },
    [storage],
  )

  // First launch: clear the stored choice and let the Engine negotiate from the device preferences.
  const simulateFirstLaunch = useCallback(() => {
    storage.removeItem(MOCK_PERSIST_KEY)
    const negotiated = pickInitialLocale(DEVICE_PREFERENCES, SUPPORTED_CODES, FALLBACK_LOCALE)
    setPreference(loadLocalePreference(storage, MOCK_PERSIST_KEY, SUPPORTED_CODES))
    setNegotiatedFrom(negotiated)
  }, [storage])

  const lines = MESSAGE_IDS.map(({ id, label }) => ({
    id,
    label,
    ...resolveLine(id, negotiatedFrom ?? activeLocale),
  }))
  const previewLocale = negotiatedFrom ?? activeLocale
  const previewDescriptor = SUPPORTED_LOCALES.find((l) => l.code === previewLocale)
  const previewRtl = isRtlLocale(previewLocale, previewDescriptor?.rtl)

  return (
    <div className="grid max-w-4xl gap-x-12 gap-y-8 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <section className="flex flex-col gap-5">
        <header className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Language
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="footnote">
            A returning visitor opens settings. The Engine read their saved choice, Brazilian
            Portuguese, back from storage before the first render. Pick another to switch instantly.
          </PUIText>
        </header>

        <div className="flex flex-col gap-2">
          {SUPPORTED_LOCALES.map((locale) => (
            <LocaleButton
              key={locale.code}
              locale={locale}
              onSelect={() => choose(locale.code)}
              selected={!negotiatedFrom && locale.code === activeLocale}
            />
          ))}
        </div>

        <PUISeparator />

        <div className="flex flex-col gap-3">
          <PUIText className="font-medium" variant="subheadline">
            First launch, no saved choice
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="footnote">
            Clear the stored choice and let the Engine negotiate from the device list{' '}
            <span className="font-mono">{DEVICE_PREFERENCES.join(', ')}</span> against the shipped
            locales.
          </PUIText>
          <PUIButton onPress={simulateFirstLaunch} size="sm" variant="outline">
            Simulate first launch
          </PUIButton>
          {negotiatedFrom ? (
            <p className="text-muted-foreground flex items-center gap-2" role="status">
              <CornerDownLeft className="size-3.5" />
              <PUIText tone="muted" variant="footnote">
                No region matched, so <span className="font-mono">pt-PT</span> negotiated down to
                shipped <span className="font-mono">{negotiatedFrom}</span>.
              </PUIText>
            </p>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <PUICard className="flex flex-col gap-5 p-6" dir={previewRtl ? 'rtl' : 'ltr'}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground flex items-center gap-2">
              <Languages className="size-4" />
              <PUIText className="font-medium" variant="footnote">
                Live preview
              </PUIText>
            </span>
            <PUIBadge dot variant={previewRtl ? 'info' : 'secondary'}>
              {previewLocale} {previewRtl ? 'RTL' : 'LTR'}
            </PUIBadge>
          </div>
          <div className="flex flex-col gap-4">
            {lines.map((line) => (
              <PreviewLine key={line.id} label={line.label} origin={line.origin} text={line.text} />
            ))}
          </div>
        </PUICard>

        <div className="flex flex-col gap-2">
          <PUIText className="max-w-prose" tone="subtle" variant="caption1">
            Every locale renders at runtime with no reload. Untranslated keys fall through to the{' '}
            {SOURCE_LOCALE.toUpperCase()} source text, never the raw key. Arabic flips the surface
            to right-to-left.
          </PUIText>
          <div className="bg-muted/40 flex flex-col gap-1 rounded-lg px-4 py-3">
            <PUIText tone="subtle" variant="caption2">
              Persisted under {MOCK_PERSIST_KEY}
            </PUIText>
            <PUIText className="font-mono break-all" variant="caption1">
              {storage.getItem(MOCK_PERSIST_KEY) ?? 'null (cleared, follows device detection)'}
            </PUIText>
          </div>
        </div>
      </section>
    </div>
  )
}

const seededDescription =
  `Ship an app in multiple languages and switch locale at runtime on the framework-agnostic Engine ` +
  `(locale registry plus device-locale negotiation, the source-text fallback resolver, and the ` +
  `versioned storage-agnostic persistence seam) the platform ships on web and native. In-memory ` +
  `demo: catalogs for de, en, a partly-translated pt-BR, and an RTL ar, with a returning visitor ` +
  `restored to pt-BR from storage. Pick a language to switch instantly, watch untranslated keys ` +
  `fall back to the German source text, see Arabic flip to right-to-left, and simulate a first ` +
  `launch to run device-locale negotiation.`

const meta = {
  title: 'Modules/Internationalization (Lingui)',
  component: I18nLinguiDemo,
  parameters: {
    layout: 'padded',
    docs: { description: { component: seededDescription } },
  },
} satisfies Meta<typeof I18nLinguiDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
