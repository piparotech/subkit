// Deterministic, stable bucketing — the core of "the same user always gets the same variant".
// A pure FNV-1a hash over `${key}:${distinctId}` maps any (flag/experiment key, distinct id) pair to a
// stable fraction in [0, 1). Bucketing is offline, dependency-free and reproducible, so a user keeps
// their variant across launches, devices and server/client without storing the assignment anywhere.
// This is what makes A/B-experiment evaluation valid (capability AC: stable variant assignment).

const FNV_OFFSET_BASIS = 2166136261
const FNV_PRIME = 16777619

/** 32-bit FNV-1a hash of a string. Identical output on every JS engine (pure integer math). */
export function hashString(input: string): number {
  let hash = FNV_OFFSET_BASIS
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, FNV_PRIME)
  }
  // Coerce to an unsigned 32-bit integer.
  return hash >>> 0
}

/**
 * Map (key, distinctId) to a stable fraction in [0, 1). Salting by `key` means a user can land in the
 * test group for one flag and the control group for another — the assignments are independent yet each
 * is individually stable.
 */
export function bucketFraction(key: string, distinctId: string): number {
  return hashString(`${key}:${distinctId}`) / 0x100000000
}

/** A weighted choice — `key` is the variant key, `weight` its share of traffic (any positive number). */
export type WeightedVariant = {
  key: string
  weight: number
}

/**
 * Deterministically pick one weighted variant for a distinct id. Weights need not sum to 1 — they are
 * normalized by their total. Returns null only when `variants` is empty or every weight is <= 0. The
 * pick is stable: the same (assignmentKey, distinctId) always lands in the same variant, and the order
 * of `variants` does not change a given user's result (cumulative bands over the normalized weights).
 */
export function assignWeighted(
  assignmentKey: string,
  distinctId: string,
  variants: readonly WeightedVariant[],
): string | null {
  // Sort by key so the cumulative bands are stable regardless of the order `variants` is listed in —
  // reordering variants in config must NOT reshuffle which users land where.
  const positive = variants.filter((v) => v.weight > 0).sort((a, b) => (a.key < b.key ? -1 : 1))
  if (positive.length === 0) return null
  const total = positive.reduce((sum, v) => sum + v.weight, 0)
  const point = bucketFraction(assignmentKey, distinctId) * total
  let cumulative = 0
  for (const variant of positive) {
    cumulative += variant.weight
    if (point < cumulative) return variant.key
  }
  // Floating-point guard: return the last positive variant if rounding pushed `point` to the edge.
  return positive[positive.length - 1]!.key
}

/**
 * Whether a distinct id falls inside a rollout percentage [0..100] for a given key. Deterministic and
 * monotonic: raising the percentage only ever ADDS users (a user enabled at 20% stays enabled at 50%),
 * so a gradual rollout never flips an already-exposed user back off.
 */
export function isInRollout(key: string, distinctId: string, percentage: number): boolean {
  if (percentage <= 0) return false
  if (percentage >= 100) return true
  return bucketFraction(`rollout:${key}`, distinctId) * 100 < percentage
}
