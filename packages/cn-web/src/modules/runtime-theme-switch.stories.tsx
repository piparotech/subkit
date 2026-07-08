import { type CSSProperties, useCallback, useMemo, useState } from 'react'

import {
  PUIBadge,
  PUIButton,
  PUICard,
  PUISegmentedControl,
  PUISeparator,
  PUISwitch,
  PUIText,
  ThemeProvider,
} from '@/components/ui'
import {
  type ColorSchemePreference,
  type Scheme,
  type ThemePreferences,
  isColorSchemePreference,
  loadThemePreferences,
  presetOverride,
  resolvePreset,
  resolvePresetTokens,
  resolveScheme,
  saveThemePreferences,
} from '@/lib/runtime-theme-switch'
import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  BASE_PRESET_ID,
  BASE_THEME_COLORS,
  MOCK_PERSIST_KEY,
  SEEDED_PRESETS,
  createMockPreferenceStorage,
} from './mock-runtime-theme-switch'

const SCHEME_OPTIONS: { label: string; value: ColorSchemePreference }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
]

/** A returning visitor: a previously saved choice the Engine reads back on first render. */
const RETURNING_VISITOR = JSON.stringify({
  version: 1,
  state: { colorScheme: 'dark', themeId: 'violet' } satisfies ThemePreferences,
})

/**
 * Map the Engine-resolved token tones onto the cn-web CSS variables, so a preset visibly recolours
 * the scoped preview. Only the roles the active preset actually overrides change; every other tone
 * resolves to its base CSS var, which is the sparse-override fallback NFR made visible.
 */
function previewVars(scheme: Scheme, themeId: string): CSSProperties {
  const preset = resolvePreset(SEEDED_PRESETS, themeId, BASE_PRESET_ID)
  const tokens = resolvePresetTokens(BASE_THEME_COLORS, presetOverride(preset, scheme))
  return {
    '--color-action-primary-background': tokens.action.primary.background,
    '--color-action-primary-foreground': tokens.action.primary.foreground,
    '--color-action-primary-hover': tokens.action.primary.hover,
    '--color-foreground-brand': tokens.foreground.brand,
    '--color-border-focus': tokens.border.focus,
  } as CSSProperties
}

function PresetSwatch({
  preset,
  selected,
  onSelect,
}: {
  preset: (typeof SEEDED_PRESETS)[number]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      aria-label={preset.label}
      aria-pressed={selected}
      className="focus-visible:ring-ring border-border bg-card hover:bg-accent aria-pressed:border-primary flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
      onClick={onSelect}
      type="button"
    >
      <span
        aria-hidden
        className="border-border/60 size-5 rounded-full border"
        style={{ backgroundColor: preset.swatch }}
      />
      <PUIText variant="footnote">{preset.label}</PUIText>
    </button>
  )
}

function ThemedPreview({ scheme, themeId }: { scheme: Scheme; themeId: string }) {
  return (
    <ThemeProvider
      className="border-border rounded-xl border p-5"
      scheme={scheme}
      style={previewVars(scheme, themeId)}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <PUIText className="font-semibold tracking-tight" variant="headline">
            Account
          </PUIText>
          <PUIText tone="brand" variant="footnote">
            Connected
          </PUIText>
        </div>
        <PUIText className="max-w-prose" tone="muted" variant="footnote">
          The whole surface re-renders against the resolved scheme and preset, with no reload.
        </PUIText>
        <div className="flex items-center gap-3">
          <PUIButton onPress={() => undefined} size="sm">
            Save changes
          </PUIButton>
          <PUIButton onPress={() => undefined} size="sm" variant="outline">
            Discard
          </PUIButton>
        </div>
      </div>
    </ThemeProvider>
  )
}

function RuntimeThemeSwitchDemo() {
  const storage = useMemo(
    () => createMockPreferenceStorage({ [MOCK_PERSIST_KEY]: RETURNING_VISITOR }),
    [],
  )

  const [prefs, setPrefs] = useState<ThemePreferences>(() =>
    loadThemePreferences(storage, MOCK_PERSIST_KEY),
  )
  const [systemDark, setSystemDark] = useState(false)

  const persist = useCallback(
    (next: ThemePreferences) => {
      setPrefs(next)
      saveThemePreferences(storage, MOCK_PERSIST_KEY, next)
    },
    [storage],
  )

  const systemScheme: Scheme = systemDark ? 'dark' : 'light'
  const scheme = resolveScheme(prefs.colorScheme, systemScheme)
  const tracksSystem = prefs.colorScheme === 'system'

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <PUIText as="h2" className="tracking-tight" variant="title3">
          Appearance
        </PUIText>
        <PUIText className="max-w-prose" tone="muted" variant="footnote">
          A returning visitor opens settings: the Engine restored their saved choice, dark with the
          Violet preset, from storage. Change it and the preference is written straight back.
        </PUIText>
      </header>

      <section className="flex flex-col gap-3">
        <PUIText className="font-medium" variant="subheadline">
          Color scheme
        </PUIText>
        <PUISegmentedControl
          onValueChange={(value) => {
            if (isColorSchemePreference(value)) persist({ ...prefs, colorScheme: value })
          }}
          options={SCHEME_OPTIONS}
          value={prefs.colorScheme}
        />
        <PUISwitch
          disabled={!tracksSystem}
          label={
            tracksSystem
              ? 'Device set to dark (System tracks it)'
              : 'Device appearance (locked by your explicit choice)'
          }
          onValueChange={setSystemDark}
          value={systemDark}
        />
      </section>

      <PUISeparator />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <PUIText className="font-medium" variant="subheadline">
            Brand preset
          </PUIText>
          <PUIBadge variant="outline">
            {scheme === 'dark' ? 'Dark tokens' : 'Light tokens'}
          </PUIBadge>
        </div>
        <div className="flex flex-wrap gap-2">
          {SEEDED_PRESETS.map((preset) => (
            <PresetSwatch
              key={preset.id}
              onSelect={() => persist({ ...prefs, themeId: preset.id })}
              preset={preset}
              selected={prefs.themeId === preset.id}
            />
          ))}
        </div>
        <PUIText className="max-w-prose" tone="subtle" variant="caption1">
          Presets override only the primary action and brand accent. Every other token role falls
          through to the base, so a sparse preset can never leave the UI undefined.
        </PUIText>
      </section>

      <ThemedPreview scheme={scheme} themeId={prefs.themeId} />

      <PUICard className="bg-muted/40 px-4 py-3">
        <PUIText tone="subtle" variant="caption1">
          Persisted under {MOCK_PERSIST_KEY}
        </PUIText>
        <PUIText className="mt-1 font-mono break-all" variant="caption1">
          {storage.getItem(MOCK_PERSIST_KEY)}
        </PUIText>
      </PUICard>
    </div>
  )
}

const seededDescription =
  `User-driven runtime theme and dark-mode switching on the framework-agnostic Engine ` +
  `(system/light/dark resolution, preset merge with base-token fallback, and the versioned ` +
  `storage-agnostic persistence seam) the platform ships on web and native. In-memory demo: a ` +
  `seeded store restores a returning visitor (dark + Violet preset); switch System/Light/Dark, ` +
  `toggle the simulated device appearance to watch System track it, and pick a brand preset to ` +
  `recolour the live preview. Every change is written back to the persisted envelope shown below.`

const meta = {
  title: 'Modules/Runtime Theme Switch',
  component: RuntimeThemeSwitchDemo,
  parameters: {
    layout: 'padded',
    docs: { description: { component: seededDescription } },
  },
} satisfies Meta<typeof RuntimeThemeSwitchDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
