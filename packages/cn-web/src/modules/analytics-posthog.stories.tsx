import { useCallback, useId, useMemo, useReducer, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIBadge, PUIButton, PUISegmentedControl, PUISwitch, PUIText } from '@/components/ui'
import {
  type ConsentState,
  type ConsentTier,
  canCaptureEvents,
  canRecordSession,
  canSendIdentifier,
} from '@/lib/analytics-posthog'
import { createErrorReporter } from '@/lib/analytics-posthog/reporter'
import { createTracker } from '@/lib/analytics-posthog/tracker'

import {
  DEMO_ACTIONS,
  DEMO_PERSON,
  type DemoAction,
  createRecordingAnalyticsSink,
  createRecordingErrorSink,
  demoEvents,
  demoSentryConfig,
} from './mock-analytics-posthog'

const TIER_OPTIONS: { value: ConsentTier; label: string }[] = [
  { value: 'off', label: 'No tracking' },
  { value: 'anonymous', label: 'Anonymous' },
  { value: 'identified', label: 'Identified' },
]

const TIER_BLURB: Record<ConsentTier, string> = {
  off: 'Nothing is sent. Every capture, identify and report is dropped at the gate.',
  anonymous: 'Usage events flow, but with no personal identifier and no session replay.',
  identified: 'Events plus an identified person. Session replay is honored only if granted below.',
}

// The seam, owned by one closure so the consent source reads a plain mutable value (never a ref during
// render). `state.current` is only mutated from event handlers, which then re-apply gating live.
function createEngine() {
  const analytics = createRecordingAnalyticsSink()
  const sentry = createRecordingErrorSink()
  const state = { current: { tier: 'off', sessionReplay: false } as ConsentState }
  const tracker = createTracker({
    sink: analytics,
    events: demoEvents,
    consent: () => state.current,
  })
  const reporter = createErrorReporter({
    sink: sentry,
    config: demoSentryConfig,
    consent: () => state.current,
  })

  return {
    analytics,
    sentry,
    // Re-apply gating without a reload: drop the person + replay on a downgrade, identify at the top.
    applyConsent(next: ConsentState) {
      state.current = next
      tracker.reset()
      reporter.setUser(null)
      tracker.syncConsent()
      if (canSendIdentifier(next)) {
        tracker.identify(DEMO_PERSON.distinctId, DEMO_PERSON.properties)
        reporter.setUser(DEMO_PERSON.distinctId)
      }
    },
    fire(action: DemoAction) {
      return action.capture(tracker)
    },
    report() {
      return reporter.report(new Error('Checkout failed: payment timed out'), {
        screen: 'checkout',
      })
    },
  }
}

function StatusRow({ label, granted, value }: { label: string; granted: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <PUIText variant="subheadline">{label}</PUIText>
      <PUIBadge dot variant={granted ? 'success' : 'secondary'}>
        {value}
      </PUIBadge>
    </div>
  )
}

function AnalyticsPosthogDemo() {
  const engine = useMemo(() => createEngine(), [])
  const [tier, setTier] = useState<ConsentTier>('off')
  const [sessionReplay, setSessionReplay] = useState(false)
  const [, bump] = useReducer((n: number) => n + 1, 0)
  const replaySwitchId = useId()

  const consent: ConsentState = { tier, sessionReplay: tier === 'identified' && sessionReplay }

  // Reconcile the gate from handlers only (never during render), then re-read the recording sinks.
  const reconcile = useCallback(
    (next: ConsentState) => {
      engine.applyConsent(next)
      bump()
    },
    [engine],
  )

  const chooseTier = useCallback(
    (next: ConsentTier) => {
      setTier(next)
      const replay = next === 'identified' && sessionReplay
      if (next !== 'identified') setSessionReplay(false)
      reconcile({ tier: next, sessionReplay: replay })
    },
    [sessionReplay, reconcile],
  )

  const toggleReplay = useCallback(
    (next: boolean) => {
      setSessionReplay(next)
      reconcile({ tier, sessionReplay: tier === 'identified' && next })
    },
    [tier, reconcile],
  )

  const { analytics, sentry } = engine
  const captureAllowed = canCaptureEvents(consent)
  const identifyAllowed = canSendIdentifier(consent)
  const replayActive = canRecordSession(consent)

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Consent decides what analytics may do
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="subheadline">
            One provider-neutral engine gates PostHog and Sentry against a three-tier ladder. Pick a
            tier and the gate reconciles live, no reload.
          </PUIText>
        </div>

        <PUISegmentedControl
          onValueChange={(value) => chooseTier(value as ConsentTier)}
          options={TIER_OPTIONS}
          value={tier}
        />
        <PUIText className="max-w-prose" tone="muted" variant="footnote">
          {TIER_BLURB[tier]}
        </PUIText>

        <div className="flex items-center justify-between gap-6">
          <div className="flex max-w-prose flex-col gap-0.5">
            <label htmlFor={replaySwitchId}>
              <PUIText className="font-medium" variant="subheadline">
                Session replay
              </PUIText>
            </label>
            <PUIText tone="muted" variant="footnote">
              Granted separately and only at the identified tier. DSGVO-critical: it never runs
              under anonymous tracking.
            </PUIText>
          </div>
          <PUISwitch
            disabled={tier !== 'identified'}
            id={replaySwitchId}
            onValueChange={toggleReplay}
            value={sessionReplay}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <PUIText as="h3" className="tracking-tight" variant="headline">
          What the gate permits now
        </PUIText>
        <div className="border-border divide-border flex flex-col divide-y rounded-xl border px-5">
          <StatusRow
            granted={captureAllowed}
            label="Capture usage events"
            value={captureAllowed ? 'Allowed' : 'Blocked'}
          />
          <StatusRow
            granted={identifyAllowed}
            label="Identify the person"
            value={analytics.identifiedAs ?? 'Anonymous'}
          />
          <StatusRow
            granted={replayActive}
            label="Session replay"
            value={replayActive ? 'Recording' : 'Stopped'}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <PUIText as="h3" className="tracking-tight" variant="headline">
            Fire something at the gate
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="footnote">
            Each button calls the typed event schema or the reporter. Calls that consent forbids are
            dropped silently, exactly as in production.
          </PUIText>
        </div>
        <div className="flex flex-wrap gap-3">
          {DEMO_ACTIONS.map((action) => (
            <PUIButton
              key={action.label}
              onPress={() => {
                engine.fire(action)
                bump()
              }}
              variant="outline"
            >
              {action.label}
            </PUIButton>
          ))}
          <PUIButton
            onPress={() => {
              engine.report()
              bump()
            }}
            variant="outline"
          >
            Throw an error
          </PUIButton>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <PUIText as="h3" className="tracking-tight" variant="headline">
              PostHog
            </PUIText>
            <PUIBadge variant={analytics.events.length ? 'info' : 'secondary'}>
              {analytics.events.length} captured
            </PUIBadge>
          </div>
          {analytics.events.length ? (
            <ul className="divide-border divide-y">
              {analytics.events.map((event, index) => (
                <li className="flex flex-col gap-0.5 py-2" key={index}>
                  <PUIText className="font-medium" variant="subheadline">
                    {event.name}
                  </PUIText>
                  <PUIText className="font-mono" tone="muted" variant="caption1">
                    {JSON.stringify(event.properties)}
                  </PUIText>
                </li>
              ))}
            </ul>
          ) : (
            <PUIText tone="subtle" variant="footnote">
              No events recorded. Raise the tier above anonymous, then fire one.
            </PUIText>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <PUIText as="h3" className="tracking-tight" variant="headline">
              Sentry
            </PUIText>
            <PUIBadge variant={sentry.errors.length ? 'info' : 'secondary'}>
              {sentry.errors.length} reported
            </PUIBadge>
          </div>
          {sentry.errors.length ? (
            <ul className="divide-border divide-y">
              {sentry.errors.map((error, index) => (
                <li className="flex flex-col gap-0.5 py-2" key={index}>
                  <PUIText className="font-medium" variant="subheadline">
                    {error.name}: {error.message}
                  </PUIText>
                  <PUIText className="font-mono" tone="muted" variant="caption1">
                    {error.release} · v{error.appVersion}
                  </PUIText>
                </li>
              ))}
            </ul>
          ) : (
            <PUIText tone="subtle" variant="footnote">
              No errors reported. Crash reporting starts at the anonymous tier, scrubbed of any
              user.
            </PUIText>
          )}
        </div>
      </section>
    </div>
  )
}

const meta = {
  title: 'Modules/Analytics & Monitoring (PostHog + Sentry)',
  component: AnalyticsPosthogDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Capture user behavior and app stability consent-gated: PostHog for product analytics (events, screens, session replay) and Sentry for error and crash reporting, both running only after valid consent. In-memory demo: a three-tier consent ladder (off / anonymous / identified) plus a separate session-replay switch over recording PostHog and Sentry stand-ins. Pick a tier and fire the seeded events or an error to watch exactly what each tier lets through, with the identifier attached only at the identified tier and replay never under anonymous.',
      },
    },
  },
} satisfies Meta<typeof AnalyticsPosthogDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
