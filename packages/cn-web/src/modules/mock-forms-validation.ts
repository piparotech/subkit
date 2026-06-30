// In-memory mock of the forms-validation server seam: the authoritative submit. The Engine's
// `revalidate` re-checks the SAME shared schema the client uses (no drift), and `createAttemptLimiter`
// enforces the lockout after N failed attempts — both run server-side in production. Here they run
// in-process against a deterministic store, so the demo is fully offline.
//
// Demo schema (login): username (required) + a 6-digit PIN. The "correct" PIN is 123456; any other
// valid-shaped PIN is rejected as a failed attempt. Lockout after 3 failures.
import { z } from 'zod'

import {
  type AttemptState,
  type FieldErrors,
  createAttemptLimiter,
  revalidate,
} from '@/lib/forms-validation'

export const LoginSchema = z.object({
  username: z.string().trim().min(1, 'Enter a username.'),
  pin: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'The PIN is exactly 6 digits.'),
})
export type LoginValues = z.infer<typeof LoginSchema>

export const correctPin = '123456'
export const maxAttempts = 3

export type SubmitResult =
  | { kind: 'success'; data: LoginValues }
  | { kind: 'invalid'; errors: FieldErrors }
  | { kind: 'rejected'; attempts: AttemptState }
  | { kind: 'locked'; attempts: AttemptState }

const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * A deterministic, offline stand-in for the server action behind the form. Re-validates against the
 * shared schema, then checks the credential and enforces the attempt limiter, keyed on the username —
 * so repeated wrong PINs lock the action after three tries.
 */
export function createMockSubmit() {
  const limiter = createAttemptLimiter({ maxAttempts, windowMs: 5 * 60 * 1000 })

  return async function submit(input: unknown): Promise<SubmitResult> {
    await delay()

    // 1) Authoritative re-validation against the shared schema (never trust the client).
    const checked = revalidate(LoginSchema, input)
    if (checked.ok === false) return { kind: 'invalid', errors: checked.errors }

    const key = checked.data.username.toLowerCase()

    // 2) Server-side lockout gate before the protected action.
    const before = await limiter.check(key)
    if (before.locked) return { kind: 'locked', attempts: before }

    // 3) The protected action — here a fixed-credential check.
    if (checked.data.pin !== correctPin) {
      const attempts = await limiter.recordFailure(key)
      return attempts.locked ? { kind: 'locked', attempts } : { kind: 'rejected', attempts }
    }

    await limiter.reset(key)
    return { kind: 'success', data: checked.data }
  }
}
