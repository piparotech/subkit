import type { z } from 'zod'

// Typed goal/conversion registry (goals.ts) — the contract for every conversion goal the site may
// report (capability AC: "ein Conversion-Ziel … erscheint als Goal/Event im Reporting"). Each goal
// name maps to a Zod schema for its custom properties (Plausible "custom props" / PostHog event
// properties). The registry derives a fully typed `trackGoal` signature so an undeclared goal or a
// malformed payload is a COMPILE error, and the runtime parse is the last line of defense.

/** A map of goal name -> Zod schema for that goal's properties. Use `z.strictObject({})` for none. */
export type GoalSchemaMap = Record<string, z.ZodType>

/** Derived properties type for a given goal name in a registry. */
export type GoalProps<M extends GoalSchemaMap, K extends keyof M> = z.infer<M[K]>

/** A failed goal validation — carries the list of issues, never any parsed data. */
export type GoalValidationError = { ok: false; issues: string[] }

/** Result of validating a goal payload — a discriminated union on `ok`. */
export type GoalValidation<M extends GoalSchemaMap, K extends keyof M> =
  | { ok: true; data: GoalProps<M, K> }
  | GoalValidationError

export type GoalRegistry<M extends GoalSchemaMap> = {
  readonly names: readonly (keyof M & string)[]
  has: (name: string) => name is keyof M & string
  /**
   * Validate properties against the declared schema. Returns the parsed (sanitized) props or a list
   * of issues. Unknown goal names are rejected (no silent passthrough).
   */
  validate: <K extends keyof M & string>(name: K, props: unknown) => GoalValidation<M, K>
}

/**
 * Define the site's conversion goals once and pass the result to `createWebTracker`. Property keys
 * are validated per goal; this is the "Seiten- und Conversion-Ziele als Events/Goals definieren"
 * ticket made type-safe.
 */
export function defineGoals<const M extends GoalSchemaMap>(schemas: M): GoalRegistry<M> {
  const names = Object.keys(schemas) as (keyof M & string)[]
  return {
    names,
    has(name): name is keyof M & string {
      return Object.prototype.hasOwnProperty.call(schemas, name)
    },
    validate(name, props) {
      const schema = schemas[name]
      if (!schema) return { ok: false, issues: [`unknown goal: ${name}`] }
      const result = schema.safeParse(props ?? {})
      if (result.success) return { ok: true, data: result.data as GoalProps<M, typeof name> }
      return {
        ok: false,
        issues: result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
      }
    },
  }
}
