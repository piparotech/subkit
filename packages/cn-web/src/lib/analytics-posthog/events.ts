import type { z } from 'zod'

// Typed event schema (events.ts) — the contract for every analytics event the app may emit. Each
// event name maps to a Zod schema for its properties; the registry derives a fully typed `capture`
// signature so an undeclared event or a malformed payload is a COMPILE error, and the runtime parse
// is the last line of defense. This is the "getypte Event-Schema" the capability requires.

/** A map of event name -> Zod schema for that event's properties. Use `z.strictObject({})` for none. */
export type EventSchemaMap = Record<string, z.ZodType>

/** Derived payload type for a given event name in a registry. */
export type EventPayload<M extends EventSchemaMap, K extends keyof M> = z.infer<M[K]>

/** Result of validating a payload: either the parsed data or a list of issues. */
export type ValidationOk<T> = { ok: true; data: T }
export type ValidationError = { ok: false; issues: string[] }
export type ValidationResult<T> = ValidationOk<T> | ValidationError

/** Type guard narrowing a validation result to its failure branch (the data branch otherwise). */
export function isValidationError<T>(result: ValidationResult<T>): result is ValidationError {
  return !result.ok
}

export type EventRegistry<M extends EventSchemaMap> = {
  readonly names: readonly (keyof M & string)[]
  has: (name: string) => name is keyof M & string
  /**
   * Validate a payload against the declared schema. Returns the parsed (sanitized) properties or a
   * list of issues. Unknown event names are rejected (no silent passthrough).
   */
  validate: <K extends keyof M & string>(
    name: K,
    payload: unknown,
  ) => ValidationResult<EventPayload<M, K>>
}

/**
 * Define the app's typed event schema once and pass the result to `createTracker`. Property keys are
 * shallow-validated; nested control of value shapes is up to each event's schema.
 */
export function defineEvents<const M extends EventSchemaMap>(schemas: M): EventRegistry<M> {
  const names = Object.keys(schemas) as (keyof M & string)[]
  return {
    names,
    has(name): name is keyof M & string {
      return Object.prototype.hasOwnProperty.call(schemas, name)
    },
    validate(name, payload) {
      const schema = schemas[name]
      if (!schema) return { ok: false, issues: [`unknown event: ${name}`] }
      const result = schema.safeParse(payload ?? {})
      if (result.success) return { ok: true, data: result.data as EventPayload<M, typeof name> }
      return {
        ok: false,
        issues: result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
      }
    },
  }
}
