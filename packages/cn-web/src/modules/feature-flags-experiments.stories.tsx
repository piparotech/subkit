import { useMemo, useReducer, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIBadge, PUIButton, PUISelect, PUISwitch, PUIText } from '@/components/ui'
import {
  type BooleanFlagDef,
  type FeatureFlags,
  type FlagRegistry,
  type VariantFlagDef,
  assignExperiment,
  createFeatureFlags,
  exposeExperiment,
} from '@/lib/feature-flags-experiments'

import {
  type MockFlagSource,
  createMockFlagSource,
  createMockReporter,
  demoContext,
  demoExperiment,
  demoFlags,
} from './mock-feature-flags-experiments'

// Recover the concrete flag-def map the registry was built from, so the store and rows stay typed
// to the seeded flags rather than the open `FlagDefMap`. Splitting the key space by def kind lets the
// store's value type resolve to a single primitive per control, with no casts.
type DemoFlagMap = typeof demoFlags extends FlagRegistry<infer M> ? M : never
type FlagKey = keyof DemoFlagMap & string
type BooleanKey = { [K in FlagKey]: DemoFlagMap[K] extends BooleanFlagDef ? K : never }[FlagKey]
type VariantKey = { [K in FlagKey]: DemoFlagMap[K] extends VariantFlagDef ? K : never }[FlagKey]

// A handful of distinct ids that all evaluate against the same experiment definition, to make the
// "same user, stable variant" guarantee visible: each lands in a fixed variant, deterministically.
const SAMPLE_USERS = ['demo-user-7f3a', 'erin-204', 'lukas-991', 'noor-006', 'sven-318'] as const

const VARIANT_TONE: Record<string, 'info' | 'success' | 'warning'> = {
  classic: 'info',
  compact: 'success',
  spacious: 'warning',
}

function isBooleanKey(key: FlagKey): key is BooleanKey {
  return demoFlags.def(key).kind === 'boolean'
}

function FlagMeta({ flagKey, isDefault }: { flagKey: FlagKey; isDefault: boolean }) {
  const def = demoFlags.def(flagKey)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <PUIText className="font-mono font-medium" variant="subheadline">
          {flagKey}
        </PUIText>
        {def.kind === 'boolean' && 'killSwitch' in def && def.killSwitch ? (
          <PUIBadge dot variant="destructive">
            kill-switch
          </PUIBadge>
        ) : null}
        <PUIBadge variant={isDefault ? 'outline' : 'secondary'}>
          {isDefault ? 'default' : 'override'}
        </PUIBadge>
      </div>
      <PUIText className="max-w-prose" tone="muted" variant="footnote">
        {def.description}
      </PUIText>
    </div>
  )
}

function BooleanFlagRow({
  flagKey,
  flags,
  onChange,
}: {
  flagKey: BooleanKey
  flags: FeatureFlags<DemoFlagMap>
  onChange: () => void
}) {
  const value = flags.getTyped(flagKey)
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <FlagMeta flagKey={flagKey} isDefault={value === demoFlags.defaultOf(flagKey)} />
      <PUISwitch
        aria-label={flagKey}
        onValueChange={(next) => {
          flags.setOverride(flagKey, next)
          onChange()
        }}
        value={value}
      />
    </div>
  )
}

function VariantFlagRow({
  flagKey,
  flags,
  onChange,
}: {
  flagKey: VariantKey
  flags: FeatureFlags<DemoFlagMap>
  onChange: () => void
}) {
  const value = flags.getTyped(flagKey)
  const options = demoFlags.def(flagKey).variants.map((variant) => ({
    label: variant,
    value: variant,
  }))
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <FlagMeta flagKey={flagKey} isDefault={value === demoFlags.defaultOf(flagKey)} />
      <PUISelect
        className="w-40"
        onValueChange={(next) => {
          flags.setOverride(flagKey, next)
          onChange()
        }}
        options={options}
        value={value}
      />
    </div>
  )
}

function FeatureFlagsExperimentsDemo() {
  const reporter = useMemo(() => createMockReporter(), [])
  const source = useMemo<MockFlagSource>(() => createMockFlagSource(), [])
  const flags = useMemo<FeatureFlags<DemoFlagMap>>(
    () => createFeatureFlags({ registry: demoFlags, source, context: demoContext }),
    [source],
  )

  const [, bump] = useReducer((n: number) => n + 1, 0)
  const [refreshing, setRefreshing] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const assignment = assignExperiment(demoExperiment, demoContext.distinctId)
  const exposures = reporter.events.length

  // Pull the current remote snapshot, then arm the kill-switch so the NEXT refresh serves the flipped
  // value. The first refresh shows the remote value winning over the default; each later one toggles it.
  async function refresh() {
    setRefreshing(true)
    await flags.refresh()
    source.toggleKillSwitch()
    setLoaded(true)
    setRefreshing(false)
  }

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-1.5">
        <PUIText as="h2" className="tracking-tight" variant="title3">
          One typed flag store, one stable experiment
        </PUIText>
        <PUIText className="max-w-prose" tone="muted" variant="subheadline">
          The same provider-neutral Engine that ships in the app, evaluated offline against a seeded
          user. Override a flag, pull a fresh remote snapshot, or read how the A/B variant is fixed
          per user.
        </PUIText>
        <PUIText className="font-mono" tone="subtle" variant="footnote">
          {demoContext.distinctId} · plan {String(demoContext.properties?.plan)} · country{' '}
          {String(demoContext.properties?.country)}
        </PUIText>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <PUIText as="h3" className="tracking-tight" variant="headline">
            Experiment: {demoExperiment.key}
          </PUIText>
          <PUIBadge variant={VARIANT_TONE[assignment.variant] ?? 'secondary'}>
            {assignment.variant}
          </PUIBadge>
        </div>
        <PUIText className="max-w-prose" tone="muted" variant="footnote">
          {demoExperiment.description} The variant is bucketed from a stable hash of the user id, so
          it never changes between launches. Goal metric{' '}
          <span className="font-mono">{assignment.goalMetric}</span> rides every exposure.
        </PUIText>

        <div className="border-border divide-border flex flex-col divide-y rounded-xl border px-5">
          {SAMPLE_USERS.map((user) => {
            const result = assignExperiment(demoExperiment, user)
            const self = user === demoContext.distinctId
            return (
              <div className="flex items-center justify-between gap-4 py-3" key={user}>
                <PUIText className="font-mono" tone={self ? 'default' : 'muted'} variant="footnote">
                  {user}
                  {self ? ' (this user)' : ''}
                </PUIText>
                <PUIBadge variant={VARIANT_TONE[result.variant] ?? 'secondary'}>
                  {result.variant}
                </PUIBadge>
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <PUIText tone="subtle" variant="caption1">
            {exposures === 0
              ? 'No exposure reported yet.'
              : `${exposures} exposure event(s) sent as $feature_flag_called`}
          </PUIText>
          <PUIButton
            onPress={() => {
              exposeExperiment(demoExperiment, demoContext.distinctId, reporter)
              bump()
            }}
            size="sm"
            variant="outline"
          >
            Report exposure
          </PUIButton>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <PUIText as="h3" className="tracking-tight" variant="headline">
            Flag registry
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="footnote">
            Every read resolves through the typed registry: an override wins, otherwise the remote
            snapshot, otherwise the declared default, never an error. Refresh flips the remote
            kill-switch so new_checkout changes at runtime with no release.
          </PUIText>
        </div>

        <div className="border-border divide-border flex flex-col divide-y rounded-xl border px-5">
          {demoFlags.keys.map((flagKey) =>
            isBooleanKey(flagKey) ? (
              <BooleanFlagRow flagKey={flagKey} flags={flags} key={flagKey} onChange={bump} />
            ) : (
              <VariantFlagRow flagKey={flagKey} flags={flags} key={flagKey} onChange={bump} />
            ),
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <PUIText tone="subtle" variant="caption1">
            {loaded ? 'Remote snapshot applied.' : 'Serving declared defaults until first refresh.'}
          </PUIText>
          <div className="flex items-center gap-2">
            <PUIButton loading={refreshing} onPress={() => void refresh()} size="sm">
              Refresh remote
            </PUIButton>
            <PUIButton
              onPress={() => {
                flags.clearAllOverrides()
                bump()
              }}
              size="sm"
              variant="outline"
            >
              Reset overrides
            </PUIButton>
          </div>
        </div>
      </section>
    </div>
  )
}

const meta = {
  title: 'Modules/Feature Flags & Experiments',
  component: FeatureFlagsExperimentsDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Roll out and steer features under control: remote feature flags with targeting and kill-switches, no app-store release, plus A/B experiments with stable variant assignment and a goal metric, on the isomorphic feature-flags-experiments Engine (typed flag registry, default-fallback store, deterministic bucketing and the exposure reporter). In-memory demo: three seeded flags (a new_checkout kill-switch, a beta_inbox gate and a home_layout variant) and a running A/B experiment for one seeded user. Override any flag, hit Refresh to flip the remote kill-switch at runtime, reset to fall back to declared defaults, and see the experiment hand every user a fixed variant with each exposure reported as $feature_flag_called.',
      },
    },
  },
} satisfies Meta<typeof FeatureFlagsExperimentsDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
