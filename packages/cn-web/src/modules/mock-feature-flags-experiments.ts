// In-memory mock of the feature-flags-experiments seams so the module is fully interactive in the
// showcase without a PostHog project. Two seams are injected:
//   - the store's `FlagSource` — in production a PostHog flag fetch; here a deterministic snapshot that
//     toggles per "remote environment" so Refresh visibly flips a kill-switch on/off
//   - the experiment `ExperimentReporter` — in production PostHog `capture`; here an in-memory event log
// The flag registry, the seeded user context and the A/B experiment definition all live here so the
// demo is offline, deterministic and reproducible (mirrors the native showcase mock so both tell the
// same story).
import {
  type EvaluationContext,
  type ExperimentDef,
  type ExperimentReporter,
  type FlagSource,
  defineFlags,
} from '@/lib/feature-flags-experiments'

/** The app's declared flags — one kill-switch gate, one beta gate and one multivariate variant. */
export const demoFlags = defineFlags({
  new_checkout: {
    kind: 'boolean',
    default: false,
    killSwitch: true,
    description:
      'New checkout flow. Kill-switch: OFF disables it at runtime, no app-store release.',
  },
  beta_inbox: {
    kind: 'boolean',
    default: false,
    description: 'Gradual rollout of the redesigned inbox.',
  },
  home_layout: {
    kind: 'variant',
    default: 'classic',
    variants: ['classic', 'compact', 'spacious'],
    description: 'Home screen layout served by the running A/B experiment.',
  },
})

/** The seeded demo user the flags and experiment are evaluated against. */
export const demoContext: EvaluationContext = {
  distinctId: 'demo-user-7f3a',
  properties: { plan: 'pro', country: 'DE' },
}

/** The running A/B experiment — control first by convention, a single goal metric. */
export const demoExperiment: ExperimentDef = {
  key: 'home_layout',
  goalMetric: 'home_engagement',
  variants: [
    { key: 'classic', weight: 1 },
    { key: 'compact', weight: 1 },
    { key: 'spacious', weight: 1 },
  ],
  description: 'Which home layout drives the most engagement.',
}

/**
 * A two-state remote: the first snapshot has the new checkout ON; flip the internal kill-switch and the
 * next Refresh serves it OFF, demonstrating a runtime kill-switch with no redeploy. The source never
 * throws, so it also stands in for the offline default-fallback path.
 */
export type MockFlagSource = FlagSource & {
  /** Flip the "remote" kill-switch so the next refresh serves new_checkout OFF (no redeploy). */
  toggleKillSwitch: () => void
}

export function createMockFlagSource(): MockFlagSource {
  let killSwitchOff = false
  return {
    toggleKillSwitch: () => {
      killSwitchOff = !killSwitchOff
    },
    fetch: async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
      return {
        new_checkout: !killSwitchOff,
        beta_inbox: true,
        home_layout: 'compact',
      }
    },
  }
}

export type ExposureEvent = { event: string; properties: Record<string, unknown> }

/** An in-memory exposure reporter — records every `capture` so the demo can show what analytics sees. */
export function createMockReporter(): ExperimentReporter & { events: ExposureEvent[] } {
  const events: ExposureEvent[] = []
  return {
    events,
    capture: (event, properties) => {
      events.push({ event, properties })
    },
  }
}
