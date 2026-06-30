import { type ReactNode, useCallback, useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIBadge, PUIButton, PUISegmentedControl, PUISwitch, PUIText } from '@/components/ui'
import {
  type AppSettings,
  type OsPermission,
  type TextSize,
  type ThemePreference,
  type TopicSubscription,
  createPrimingStore,
  createSettingsStore,
  createTopicsStore,
  shouldShowSoftAsk,
} from '@/lib/app-settings'

import {
  DEMO_APP_SETTINGS_CONFIG,
  DEMO_DEVICE_LOCALE,
  DEMO_LOCALE_LABELS,
  createMockOsPermissionRequester,
  createMockSettingsStorage,
} from './mock-app-settings'

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'system', label: 'System' },
]

const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: 'small', label: 'Klein' },
  { value: 'default', label: 'Standard' },
  { value: 'large', label: 'Groß' },
  { value: 'xlarge', label: 'XL' },
]

const TEXT_SIZE_SCALE: Record<TextSize, number> = {
  small: 0.875,
  default: 1,
  large: 1.15,
  xlarge: 1.3,
}

const PERMISSION_BADGE: Record<
  OsPermission,
  { label: string; variant: 'success' | 'destructive' | 'secondary' }
> = {
  granted: { label: 'Erlaubt', variant: 'success' },
  denied: { label: 'Abgelehnt', variant: 'destructive' },
  undetermined: { label: 'Nicht entschieden', variant: 'secondary' },
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <PUIText as="label" className="font-medium" variant="subheadline">
          {label}
        </PUIText>
        {hint ? (
          <PUIText className="max-w-prose" tone="muted" variant="footnote">
            {hint}
          </PUIText>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function AppSettingsDemo() {
  const config = DEMO_APP_SETTINGS_CONFIG
  const storage = useMemo(() => createMockSettingsStorage(), [])
  const requestOsPermission = useMemo(() => createMockOsPermissionRequester('granted'), [])

  const settingsStore = useMemo(
    () => createSettingsStore({ config, storage, deviceLocale: DEMO_DEVICE_LOCALE }),
    [config, storage],
  )
  const topicsStore = useMemo(() => createTopicsStore({ config, storage }), [config, storage])
  const primingStore = useMemo(
    () => createPrimingStore({ config: config.priming, storage }),
    [config, storage],
  )

  const [settings, setSettings] = useState<AppSettings>(() => settingsStore.read())
  const [topics, setTopics] = useState<TopicSubscription[]>(() => topicsStore.list())
  const [priming, setPriming] = useState(() => primingStore.read())
  const [softAskVisible, setSoftAskVisible] = useState(() =>
    shouldShowSoftAsk(priming, config.priming),
  )
  const [requesting, setRequesting] = useState(false)

  const setLocale = useCallback(
    (locale: string | null) => setSettings(settingsStore.setLocale(locale)),
    [settingsStore],
  )
  const setTheme = useCallback(
    (theme: ThemePreference) => setSettings(settingsStore.setTheme(theme)),
    [settingsStore],
  )
  const setTextSize = useCallback(
    (textSize: TextSize) => setSettings(settingsStore.setTextSize(textSize)),
    [settingsStore],
  )
  const toggleTopic = useCallback((id: string) => setTopics(topicsStore.toggle(id)), [topicsStore])

  const acceptSoftAsk = useCallback(async () => {
    setSoftAskVisible(false)
    const decision = primingStore.acceptSoftAsk()
    if (!decision.requestOs) {
      setPriming(decision.state)
      return
    }
    setRequesting(true)
    const outcome = await requestOsPermission()
    setPriming(primingStore.setOsPermission(outcome))
    setRequesting(false)
  }, [primingStore, requestOsPermission])

  const declineSoftAsk = useCallback(() => {
    setPriming(primingStore.declineSoftAsk())
    setSoftAskVisible(false)
  }, [primingStore])

  const resetAll = useCallback(() => {
    setSettings(settingsStore.reset())
    setTopics(topicsStore.reset())
    setPriming(primingStore.reset())
    setSoftAskVisible(shouldShowSoftAsk(primingStore.read(), config.priming))
  }, [settingsStore, topicsStore, primingStore, config.priming])

  const subscribedCount = topics.filter((topic) => topic.subscribed).length
  const permission = PERMISSION_BADGE[priming.osPermission]

  return (
    <div className="flex max-w-2xl flex-col gap-12">
      <header className="flex flex-col gap-1.5">
        <PUIText as="h2" className="tracking-tight" variant="title2">
          App-Einstellungen
        </PUIText>
        <PUIText className="max-w-prose" tone="muted" variant="subheadline">
          Sprache, Erscheinungsbild und Push-Themen, on-device geführt und ohne Konto. Jede Änderung
          wirkt sofort und übersteht einen Neustart.
        </PUIText>
      </header>

      <section className="flex flex-col gap-8">
        <PUIText as="h3" className="tracking-tight" tone="subtle" variant="caption1">
          Erscheinungsbild
        </PUIText>

        <Field
          hint="Folgt dem Gerät, bis du eine Sprache festlegst. Ohne Festlegung greift hier de-DE."
          label="Sprache"
        >
          <PUISegmentedControl
            onValueChange={(value) => setLocale(value === 'system' ? null : value)}
            options={[
              { value: 'system', label: 'System' },
              ...config.supportedLocales.map((locale) => ({
                value: locale,
                label: DEMO_LOCALE_LABELS[locale] ?? locale,
              })),
            ]}
            value={settings.localePinned ? settings.locale : 'system'}
          />
          <PUIText tone="muted" variant="footnote">
            Aktiv: {DEMO_LOCALE_LABELS[settings.locale] ?? settings.locale}
            {settings.localePinned ? ' (festgelegt)' : ' (vom Gerät)'}
          </PUIText>
        </Field>

        <Field label="Erscheinungsbild">
          <PUISegmentedControl
            onValueChange={(value) => setTheme(value as ThemePreference)}
            options={THEMES}
            value={settings.theme}
          />
        </Field>

        <Field label="Textgröße">
          <PUISegmentedControl
            onValueChange={(value) => setTextSize(value as TextSize)}
            options={TEXT_SIZES}
            value={settings.textSize}
          />
          <p
            className="text-foreground"
            style={{ fontSize: `${TEXT_SIZE_SCALE[settings.textSize]}rem` }}
          >
            Die Schnelle braune Füchsin springt über den faulen Hund.
          </p>
        </Field>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <PUIText as="h3" className="tracking-tight" tone="subtle" variant="caption1">
            Push-Themen
          </PUIText>
          <PUIText tone="muted" variant="footnote">
            {subscribedCount} von {topics.length} abonniert
          </PUIText>
        </div>

        <ul className="divide-border divide-y">
          {topics.map((topic) => (
            <li className="flex items-center justify-between gap-6 py-4" key={topic.id}>
              <div className="flex flex-col gap-0.5">
                <PUIText className="font-medium" variant="subheadline">
                  {topic.label}
                </PUIText>
                <PUIText tone="muted" variant="footnote">
                  {topic.defaultSubscribed ? 'Standardmäßig an' : 'Standardmäßig aus'}
                </PUIText>
              </div>
              <PUISwitch onValueChange={() => toggleTopic(topic.id)} value={topic.subscribed} />
            </li>
          ))}
        </ul>

        <PUIText tone="subtle" variant="footnote">
          Die Auswahl bleibt rein on-device. Das tatsächliche Abonnieren übernimmt die
          Push-Mechanik, das account-gebundene Routing ist ein eigener Baustein.
        </PUIText>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <PUIText as="h3" className="tracking-tight" tone="subtle" variant="caption1">
            Push-Berechtigung
          </PUIText>
          <PUIBadge dot variant={permission.variant}>
            {permission.label}
          </PUIBadge>
        </div>

        {softAskVisible ? (
          <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5">
            <div className="flex flex-col gap-1">
              <PUIText className="font-medium" variant="headline">
                Wichtiges nicht verpassen?
              </PUIText>
              <PUIText className="max-w-prose" tone="muted" variant="footnote">
                Wir fragen die Systemberechtigung erst, wenn du hier zustimmst. So geht der
                einmalige iOS-Dialog nicht ungenutzt verloren.
              </PUIText>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <PUIButton loading={requesting} onPress={acceptSoftAsk}>
                Benachrichtigungen erlauben
              </PUIButton>
              <PUIButton onPress={declineSoftAsk} variant="ghost">
                Jetzt nicht
              </PUIButton>
            </div>
          </div>
        ) : (
          <PUIText className="max-w-prose" tone="muted" variant="footnote">
            {priming.osPermission === 'undetermined'
              ? 'Der Soft-Ask wird nicht mehr gezeigt. Setze die Einstellungen zurück, um ihn erneut zu sehen.'
              : 'Die Systementscheidung steht fest, ein erneutes Fragen entfällt.'}
          </PUIText>
        )}
      </section>

      <footer className="border-border flex items-center justify-between gap-4 border-t pt-6">
        <PUIText tone="subtle" variant="footnote">
          Soft-Ask {priming.prompts}x gezeigt, max. {config.priming.maxPrompts}x.
        </PUIText>
        <PUIButton onPress={resetAll} size="sm" variant="outline">
          Auf Standard zurücksetzen
        </PUIButton>
      </footer>
    </div>
  )
}

const seededDescription =
  'On-device app settings without login: language, theme and text size persisted via the storage ' +
  'seam, plus an on-device push-topic subscription store and permission soft-ask priming, all from ' +
  'the framework-agnostic app-settings Engine. In-memory demo: seeded with 3 locales, system theme ' +
  'and 4 push topics over a fresh in-memory store; change a preference and it resolves immediately, ' +
  'toggle topics, or accept the soft-ask to drive the mocked OS permission dialog, then reset.'

const meta = {
  title: 'Modules/App Settings',
  component: AppSettingsDemo,
  parameters: {
    layout: 'padded',
    docs: { description: { component: seededDescription } },
  },
} satisfies Meta<typeof AppSettingsDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
