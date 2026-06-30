import { useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  PUIBadge,
  PUIButton,
  PUICard,
  PUISegmentedControl,
  PUISwitch,
  PUIText,
} from '@/components/ui'
import {
  type ConsentStatus,
  type ScriptState,
  type TrackOutcome,
  createScriptLoader,
  createWebTracker,
  isTrackingAllowed,
  noopSink,
} from '@/lib/web-analytics-vitals'

import {
  type SeededGoalName,
  type SeededTracker,
  createMemoryScriptHost,
  seededConfig,
  seededGoals,
} from './mock-web-analytics-vitals'

type FeedEntry = { id: number; label: string; outcome: TrackOutcome }

const CONSENT_OPTIONS: { label: string; value: ConsentStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Granted', value: 'granted' },
  { label: 'Denied', value: 'denied' },
]

const SCRIPT_STATE: Record<
  ScriptState,
  { label: string; variant: 'success' | 'secondary' | 'warning' }
> = {
  loaded: { label: 'Scripts loaded', variant: 'success' },
  unloaded: { label: 'Scripts unloaded', variant: 'secondary' },
  'blocked-non-production': { label: 'Blocked: not production', variant: 'warning' },
}

/** A goal button bound to its typed props, so the call stays type-checked against its schema. */
type GoalShot = { name: SeededGoalName; fire: (tracker: SeededTracker) => TrackOutcome }

const GOAL_SHOTS: GoalShot[] = [
  { name: 'Signup completed', fire: (t) => t.trackGoal('Signup completed', { plan: 'pro' }) },
  {
    name: 'Contact form sent',
    fire: (t) => t.trackGoal('Contact form sent', { topic: 'Module catalog' }),
  },
  { name: 'Newsletter', fire: (t) => t.trackGoal('Newsletter', {}) },
]

function outcomeBadge(outcome: TrackOutcome) {
  if (outcome.status === 'tracked') return { label: 'Sent', variant: 'success' as const }
  if (outcome.status === 'blocked') return { label: 'No consent', variant: 'secondary' as const }
  return { label: 'Invalid', variant: 'destructive' as const }
}

function WebAnalyticsVitalsDemo() {
  const [consent, setConsent] = useState<ConsentStatus>('pending')
  const [production, setProduction] = useState(true)
  const [feed, setFeed] = useState<FeedEntry[]>([])
  const [nextId, setNextId] = useState(0)

  // The Engine reads consent + production through these closures, so a fresh wiring per gate change
  // is pure (no render-phase mutation): `sync` reconciles the script presence, the tracker forwards.
  const { tracker, scriptState } = useMemo(() => {
    const consentSource = () => ({ analytics: consent })
    const host = createMemoryScriptHost(production)
    const loader = createScriptLoader({ host, config: seededConfig, consent: consentSource })
    return {
      tracker: createWebTracker({
        sink: noopSink(),
        goals: seededGoals,
        consent: consentSource,
        config: seededConfig,
      }),
      scriptState: loader.sync(),
    }
  }, [consent, production])

  const allowed = isTrackingAllowed({ analytics: consent }, seededConfig.consentMode)

  const push = (label: string, outcome: TrackOutcome) => {
    setFeed((previous) => [{ id: nextId, label, outcome }, ...previous].slice(0, 8))
    setNextId((value) => value + 1)
  }

  const status = SCRIPT_STATE[scriptState]

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Consent and environment
          </PUIText>
          <PUIText tone="muted" variant="subheadline">
            The same two gates the Engine consults before any script loads or any event is sent.
            Seeded as DSGVO opt-in, production-only, for piparo.tech.
          </PUIText>
        </div>

        <div className="flex flex-col gap-2">
          <PUIText className="font-medium" variant="footnote">
            Visitor decision
          </PUIText>
          <PUISegmentedControl
            className="w-full"
            onValueChange={(value) => setConsent(value as ConsentStatus)}
            options={CONSENT_OPTIONS}
            value={consent}
          />
        </div>

        <PUICard className="flex items-center justify-between gap-6 p-4">
          <div className="flex flex-col gap-0.5">
            <PUIText className="font-medium" variant="subheadline">
              Production runtime
            </PUIText>
            <PUIText tone="muted" variant="footnote">
              Off mirrors dev or preview: scripts stay inert no matter the consent, so dashboards
              never see test traffic.
            </PUIText>
          </div>
          <PUISwitch onValueChange={setProduction} value={production} />
        </PUICard>
      </section>

      <section className="border-border flex items-center justify-between gap-4 border-t border-b py-4">
        <div className="flex flex-col gap-1">
          <PUIText tone="muted" variant="footnote">
            Provider script lifecycle
          </PUIText>
          <PUIBadge variant={status.variant}>{status.label}</PUIBadge>
        </div>
        <PUIText className="max-w-xs text-right" tone="subtle" variant="footnote">
          {scriptState === 'blocked-non-production'
            ? 'productionOnly holds the scripts back before consent is even read.'
            : allowed
              ? 'Consent allows tracking: Plausible and PostHog are injected once.'
              : 'No consent: scripts removed and every event is dropped (opt-out honored).'}
        </PUIText>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Fire events
          </PUIText>
          <PUIText tone="muted" variant="subheadline">
            Each call passes through the tracker. Goals are validated against their typed schema;
            all of them are dropped unless the gates above allow tracking.
          </PUIText>
        </div>

        <div className="flex flex-wrap gap-2">
          <PUIButton
            onPress={() => push('Pageview /modules', tracker.pageview('/modules', '/'))}
            size="sm"
            variant="outline"
          >
            Pageview
          </PUIButton>
          {GOAL_SHOTS.map((shot) => (
            <PUIButton
              key={shot.name}
              onPress={() => push(`Goal: ${shot.name}`, shot.fire(tracker))}
              size="sm"
              variant="outline"
            >
              {shot.name}
            </PUIButton>
          ))}
          <PUIButton
            onPress={() =>
              push('Outbound github.com', tracker.trackOutbound('https://github.com/piparotech'))
            }
            size="sm"
            variant="outline"
          >
            Outbound link
          </PUIButton>
          <PUIButton
            onPress={() =>
              push('Download whitepaper.pdf', tracker.trackDownload('/files/whitepaper.pdf'))
            }
            size="sm"
            variant="outline"
          >
            File download
          </PUIButton>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <PUIText className="font-medium" variant="subheadline">
            Ingest feed
          </PUIText>
          {feed.length > 0 ? (
            <PUIButton onPress={() => setFeed([])} size="sm" variant="ghost">
              Clear
            </PUIButton>
          ) : null}
        </div>
        {feed.length === 0 ? (
          <PUIText tone="muted" variant="footnote">
            Nothing fired yet. With consent Pending under opt-in, the next event is dropped: grant
            consent to watch the same calls reach the provider.
          </PUIText>
        ) : (
          <ul className="divide-border divide-y">
            {feed.map((entry) => {
              const badge = outcomeBadge(entry.outcome)
              return (
                <li className="flex items-center justify-between gap-4 py-2.5" key={entry.id}>
                  <PUIText className="font-mono break-words" variant="footnote">
                    {entry.label}
                  </PUIText>
                  <PUIBadge variant={badge.variant}>{badge.label}</PUIBadge>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <PUIText className="border-border border-t pt-4" tone="subtle" variant="footnote">
        Same provider-neutral Engine the platform runs in the browser, on the server (no-op) and in
        tests, here driven through an in-memory script host and ingest sink.
      </PUIText>
    </div>
  )
}

const meta = {
  title: 'Modules/Web Analytics (Plausible / PostHog)',
  component: WebAnalyticsVitalsDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Measure a website privacy-first: pageviews, typed conversion goals, outbound and download tracking, gated by consent and loaded production-only. In-memory demo: a seeded piparo.tech config (Plausible plus PostHog, DSGVO opt-in, production-only) and three typed goals. Switch the visitor decision and toggle Production to watch the script lifecycle reconcile, then fire events to see which reach the provider and which are dropped.',
      },
    },
  },
} satisfies Meta<typeof WebAnalyticsVitalsDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
