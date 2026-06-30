import { isInRollout } from './assignment'

// Targeting evaluation — decides whether a given user (their distinct id + properties) is in scope for
// a flag. A flag carries an ordered list of release conditions; the FIRST matching condition wins and
// yields its payload/rollout, mirroring how PostHog evaluates flag release conditions. Pure and
// offline: the host supplies the user context, the Engine decides. This is the "Targeting-Segment"
// gate (capability AC: only the targeted segment receives the feature).

/** The user context a condition is matched against. Properties are host-defined (plan, country, …). */
export type EvaluationContext = {
  distinctId: string
  properties?: Record<string, PropertyValue>
}

export type PropertyValue = string | number | boolean | null

/** Comparison operators for a single property filter. String ops are case-sensitive. */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'in'
  | 'not_in'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'is_set'
  | 'is_not_set'

export type PropertyFilter = {
  property: string
  operator: FilterOperator
  /** Comparison value(s). Ignored for `is_set`/`is_not_set`. */
  value?: PropertyValue | PropertyValue[]
}

/**
 * A release condition: ALL its property filters must match AND the user must fall inside `rolloutPercent`
 * (0..100, default 100). When matched, the condition's `variant` (if any) is the served value.
 */
export type ReleaseCondition = {
  filters?: PropertyFilter[]
  /** Percentage of the matched audience that actually receives the feature (gradual rollout). */
  rolloutPercent?: number
  /** Variant key served when this condition wins (for multivariate flags). */
  variant?: string
}

function asArray(value: PropertyValue | PropertyValue[] | undefined): PropertyValue[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function matchesFilter(filter: PropertyFilter, props: Record<string, PropertyValue>): boolean {
  const has = Object.prototype.hasOwnProperty.call(props, filter.property)
  const actual = has ? props[filter.property] : undefined

  switch (filter.operator) {
    case 'is_set':
      return has && actual !== null && actual !== undefined
    case 'is_not_set':
      return !has || actual === null || actual === undefined
    default:
      break
  }

  if (!has || actual === null || actual === undefined) return false
  const expected = filter.value

  switch (filter.operator) {
    case 'eq':
      return actual === expected
    case 'neq':
      return actual !== expected
    case 'in':
      return asArray(expected).includes(actual)
    case 'not_in':
      return !asArray(expected).includes(actual)
    case 'contains':
      return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected)
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      if (typeof actual !== 'number' || typeof expected !== 'number') return false
      if (filter.operator === 'gt') return actual > expected
      if (filter.operator === 'gte') return actual >= expected
      if (filter.operator === 'lt') return actual < expected
      return actual <= expected
    }
    default:
      return false
  }
}

/** Whether every filter in a condition matches the context's properties. */
export function matchesCondition(condition: ReleaseCondition, context: EvaluationContext): boolean {
  const props = context.properties ?? {}
  return (condition.filters ?? []).every((f) => matchesFilter(f, props))
}

export type TargetingMatch = {
  matched: boolean
  /** The winning condition's variant, when one matched and carried a variant. */
  variant?: string
}

/**
 * Evaluate a flag's ordered conditions for a context. The first condition whose filters all match AND
 * whose rollout includes the user wins. A flag with NO conditions targets everyone (matched: true).
 */
export function evaluateTargeting(
  flagKey: string,
  conditions: readonly ReleaseCondition[],
  context: EvaluationContext,
): TargetingMatch {
  if (conditions.length === 0) return { matched: true }
  for (const condition of conditions) {
    if (!matchesCondition(condition, context)) continue
    const rollout = condition.rolloutPercent ?? 100
    if (!isInRollout(flagKey, context.distinctId, rollout)) continue
    return { matched: true, variant: condition.variant }
  }
  return { matched: false }
}
