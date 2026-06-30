import { assignWeighted } from './assignment'

// A/B experiments — a thin, deterministic layer over the bucketing in assignment.ts. An experiment is
// a key + weighted variants (control first by convention) + a goal metric. `assignExperiment` gives a
// user a STABLE variant (same user -> same variant, capability AC) and emits a `$feature_flag_called`-
// style exposure event through an injected reporter so the variant assignment AND the goal metric are
// reconstructable in analytics (capability AC: evaluation is traceable in analytics). Provider-neutral:
// the reporter is injected (PostHog `capture` in production, a fake in tests), so this is offline.

export type ExperimentVariant = {
  key: string
  /** Share of traffic for this variant (relative weight; need not sum to 1). */
  weight: number
}

export type ExperimentDef = {
  key: string
  variants: readonly ExperimentVariant[]
  /** The single metric the experiment optimizes — emitted with every exposure for clean attribution. */
  goalMetric: string
  /** Fraction [0..1] of users entered into the experiment at all; the rest get `holdout`. */
  exposure?: number
  description?: string
}

/** The minimal analytics surface the experiment layer needs (PostHog's `capture` satisfies this). */
export type ExperimentReporter = {
  capture: (event: string, properties: Record<string, unknown>) => void
}

export type ExperimentAssignment = {
  experiment: string
  /** The assigned variant key, or `holdout` when the user is outside the exposure fraction. */
  variant: string
  goalMetric: string
  enrolled: boolean
}

/** The reserved variant key for users not entered into the experiment (outside `exposure`). */
export const HOLDOUT = 'holdout'

/** The exposure event name — mirrors PostHog's flag-call event so analytics joins on the same shape. */
export const EXPOSURE_EVENT = '$feature_flag_called'

/**
 * Deterministically assign a user to an experiment variant. Stable across calls/devices: the same
 * (experiment key, distinct id) always yields the same variant. Users outside the `exposure` fraction
 * are assigned `holdout` and never enrolled. Returns the control (first) variant if weights are empty.
 */
export function assignExperiment(def: ExperimentDef, distinctId: string): ExperimentAssignment {
  const exposure = def.exposure ?? 1
  const enrolled =
    exposure >= 1 ||
    (exposure > 0 &&
      assignWeighted(`exposure:${def.key}`, distinctId, [
        { key: 'in', weight: exposure },
        { key: 'out', weight: 1 - exposure },
      ]) === 'in')

  if (!enrolled) {
    return { experiment: def.key, variant: HOLDOUT, goalMetric: def.goalMetric, enrolled: false }
  }

  const variant =
    assignWeighted(def.key, distinctId, def.variants) ?? def.variants[0]?.key ?? HOLDOUT
  return { experiment: def.key, variant, goalMetric: def.goalMetric, enrolled: true }
}

/**
 * Assign AND report the exposure in one call. The exposure event carries the flag key + variant so the
 * assignment is reconstructable, plus the goal metric so downstream analysis joins the right metric.
 * A holdout user is still reported (with `enrolled: false`) so the control population is measurable.
 */
export function exposeExperiment(
  def: ExperimentDef,
  distinctId: string,
  reporter: ExperimentReporter,
): ExperimentAssignment {
  const assignment = assignExperiment(def, distinctId)
  reporter.capture(EXPOSURE_EVENT, {
    $feature_flag: def.key,
    $feature_flag_response: assignment.variant,
    goal_metric: assignment.goalMetric,
    enrolled: assignment.enrolled,
  })
  return assignment
}
