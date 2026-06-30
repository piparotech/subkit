// The consent model — the single, provider-neutral source of truth for what tracking is allowed.
// Two interchangeable shapes of the SAME outcome (capability `consent-management`), picked per
// platform via `mode`:
//   - web    → category-based (necessary / statistics / marketing), opt-in.
//   - mobile → a 3-step ladder (off / anonymous / identified).
// Everything here is a PURE function over a `ConsentDecision`, so it is unit-testable offline and
// behaves identically on every platform — no SDK, no storage, no DOM.

/** Built-in web categories. `necessary` is always granted (strictly required, no opt-in). */
export type ConsentCategory = 'necessary' | 'statistics' | 'marketing'
export const CONSENT_CATEGORIES: readonly ConsentCategory[] = [
  'necessary',
  'statistics',
  'marketing',
]

/** Mobile 3-step ladder (mutually exclusive). */
export type ConsentTier = 'off' | 'anonymous' | 'identified'
export const CONSENT_TIERS: readonly ConsentTier[] = ['off', 'anonymous', 'identified']

export type ConsentMode = 'category' | 'tier'

/** A persisted, versioned consent decision. `categories` is used in `category` mode, `tier` in `tier` mode. */
export type ConsentDecision = {
  mode: ConsentMode
  /** Granted categories (category mode). `necessary` is always implied true regardless of contents. */
  categories: ConsentCategory[]
  /** Selected tier (tier mode). */
  tier: ConsentTier
  /** Bumped when the consent surface/policy changes — a higher value invalidates a stored decision. */
  version: number
  /** Epoch ms the decision was recorded (for audit/expiry by the host). */
  decidedAt: number
}

export type ConsentInit = {
  mode: ConsentMode
  /** Decision-surface version; a stored decision with a lower version is treated as "not decided". */
  version?: number
}

export function isConsentCategory(value: unknown): value is ConsentCategory {
  return value === 'necessary' || value === 'statistics' || value === 'marketing'
}

export function isConsentTier(value: unknown): value is ConsentTier {
  return value === 'off' || value === 'anonymous' || value === 'identified'
}

function now(): number {
  return Date.now()
}

/** A fresh, fully-rejected decision: only `necessary` (category mode) / `off` (tier mode). */
export function defaultDecision(init: ConsentInit): ConsentDecision {
  return {
    mode: init.mode,
    categories: ['necessary'],
    tier: 'off',
    version: init.version ?? 1,
    decidedAt: 0,
  }
}

/** Accept everything the surface offers (all categories / the `identified` tier). */
export function acceptAll(init: ConsentInit): ConsentDecision {
  return {
    mode: init.mode,
    categories: [...CONSENT_CATEGORIES],
    tier: 'identified',
    version: init.version ?? 1,
    decidedAt: now(),
  }
}

/** Reject everything optional (necessary-only / off) but RECORD the decision (decidedAt set). */
export function rejectAll(init: ConsentInit): ConsentDecision {
  return {
    mode: init.mode,
    categories: ['necessary'],
    tier: 'off',
    version: init.version ?? 1,
    decidedAt: now(),
  }
}

/** Record an explicit category selection (necessary is force-included; unknown entries dropped). */
export function decideCategories(
  init: ConsentInit,
  categories: ConsentCategory[],
): ConsentDecision {
  const selected = new Set<ConsentCategory>(categories.filter(isConsentCategory))
  selected.add('necessary')
  return {
    mode: init.mode,
    categories: CONSENT_CATEGORIES.filter((c) => selected.has(c)),
    tier: 'off',
    version: init.version ?? 1,
    decidedAt: now(),
  }
}

/** Record an explicit tier selection. */
export function decideTier(init: ConsentInit, tier: ConsentTier): ConsentDecision {
  return {
    mode: init.mode,
    categories: ['necessary'],
    tier: isConsentTier(tier) ? tier : 'off',
    version: init.version ?? 1,
    decidedAt: now(),
  }
}

/**
 * Normalize untrusted persisted/input state into a valid `ConsentDecision`, fail-safe to the default.
 * A decision whose stored version is below the surface version is returned UNDECIDED (decidedAt 0) so
 * the host re-prompts after a policy/surface change.
 */
export function normalizeDecision(input: unknown, init: ConsentInit): ConsentDecision {
  const fallback = defaultDecision(init)
  if (typeof input !== 'object' || input === null) return fallback
  const record = input as Record<string, unknown>

  const storedVersion = typeof record.version === 'number' ? record.version : 0
  if (storedVersion < fallback.version) return fallback

  const rawCategories = Array.isArray(record.categories) ? record.categories : []
  const selected = new Set<ConsentCategory>(rawCategories.filter(isConsentCategory))
  selected.add('necessary')

  return {
    mode: init.mode,
    categories: CONSENT_CATEGORIES.filter((c) => selected.has(c)),
    tier: isConsentTier(record.tier) ? record.tier : 'off',
    version: fallback.version,
    decidedAt: typeof record.decidedAt === 'number' ? record.decidedAt : 0,
  }
}

/** Whether the user has made any explicit choice yet (the banner/sheet stays open until then). */
export function isDecided(decision: ConsentDecision): boolean {
  return decision.decidedAt > 0
}

/**
 * Whether a given consent CATEGORY is granted. In tier mode the tiers map onto categories so a single
 * gate can serve both surfaces: anonymous → statistics; identified → statistics + marketing.
 */
export function isCategoryGranted(decision: ConsentDecision, category: ConsentCategory): boolean {
  if (category === 'necessary') return true
  if (decision.mode === 'category') return decision.categories.includes(category)
  if (category === 'statistics') return decision.tier !== 'off'
  return decision.tier === 'identified' // marketing
}

/**
 * Whether a personal identifier may be sent to third parties. False unless the user granted more than
 * necessary-only — i.e. marketing (category mode) or the `identified` tier (tier mode). This is the
 * DSGVO-critical gate: necessary-only / rejected consent must NEVER carry an identifier.
 */
export function allowsIdentifier(decision: ConsentDecision): boolean {
  if (decision.mode === 'category') return decision.categories.includes('marketing')
  return decision.tier === 'identified'
}
