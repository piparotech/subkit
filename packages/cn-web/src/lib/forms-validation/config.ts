import { z } from 'zod'

/**
 * The `forms-validation` module's `config.schema` — the lockout policy for the server-side attempt
 * limiter. The per-form Zod schema is supplied by the host (forms differ per app); this config only
 * carries the cross-cutting lockout knobs.
 */
export const LockoutConfig = z.strictObject({
  maxAttempts: z.number().int().positive().default(5),
  windowMs: z
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
})
export type LockoutConfig = z.infer<typeof LockoutConfig>

export const FormsConfig = z.strictObject({
  lockout: LockoutConfig.default(() => LockoutConfig.parse({})),
})
export type FormsConfig = z.infer<typeof FormsConfig>

export type EditableBy = 'piparo' | 'customer'
export const formsConfigRights: Record<string, EditableBy> = {
  lockout: 'piparo',
}

export function parseFormsConfig(input: unknown) {
  return FormsConfig.safeParse(input)
}
