// Typed flag registry — the single declaration of every flag the app knows, each with its kind and
// its DEFAULT value. The default is the contract for "if evaluation is unreachable, a defined default
// applies without error" (capability AC): the store falls back to it whenever the source has no value.
// Declaring a flag = adding a line here, so an undeclared key or a wrong-typed default is a compile
// error and `getTyped` returns a precisely typed value per flag.

/** A boolean on/off flag (the typical kill-switch / gate). */
export type BooleanFlagDef = {
  kind: 'boolean'
  default: boolean
  /** A kill-switch flag is one whose OFF state must take effect at runtime to disable a feature. */
  killSwitch?: boolean
  description?: string
}

/** A multivariate flag — one of a fixed set of string variants. */
export type VariantFlagDef = {
  kind: 'variant'
  default: string
  variants: readonly string[]
  description?: string
}

export type FlagDef = BooleanFlagDef | VariantFlagDef

/** A map of flag key -> its definition. */
export type FlagDefMap = Record<string, FlagDef>

/** The resolved value type for a flag def (boolean for boolean flags, string for variant flags). */
export type FlagValue<D extends FlagDef> = D extends BooleanFlagDef ? boolean : string

export type FlagRegistry<M extends FlagDefMap> = {
  readonly keys: readonly (keyof M & string)[]
  has: (key: string) => key is keyof M & string
  def: <K extends keyof M & string>(key: K) => M[K]
  /** The declared default value for a flag — the guaranteed fallback. */
  defaultOf: <K extends keyof M & string>(key: K) => FlagValue<M[K]>
  /**
   * Coerce a raw value coming from the source into the flag's declared type, falling back to the
   * default when the raw value is missing or invalid (e.g. an unknown variant). Never throws.
   */
  coerce: <K extends keyof M & string>(key: K, raw: unknown) => FlagValue<M[K]>
}

/** Declare the app's flags once and pass the registry to `createFeatureFlags`. */
export function defineFlags<const M extends FlagDefMap>(defs: M): FlagRegistry<M> {
  const keys = Object.keys(defs) as (keyof M & string)[]

  // `defs[key]` is `M[K] | undefined` under noUncheckedIndexedAccess and a union per-flag; widen to the
  // base `FlagDef` so `kind` narrows cleanly (the key is always present — it comes from `keyof M`).
  function lookup(key: keyof M & string): FlagDef {
    return defs[key] as FlagDef
  }

  function def<K extends keyof M & string>(key: K): M[K] {
    return defs[key]
  }

  function defaultOf<K extends keyof M & string>(key: K): FlagValue<M[K]> {
    return lookup(key).default as FlagValue<M[K]>
  }

  function coerce<K extends keyof M & string>(key: K, raw: unknown): FlagValue<M[K]> {
    const definition = lookup(key)
    if (definition.kind === 'boolean') {
      return (typeof raw === 'boolean' ? raw : definition.default) as FlagValue<M[K]>
    }
    const ok = typeof raw === 'string' && definition.variants.includes(raw)
    return (ok ? raw : definition.default) as FlagValue<M[K]>
  }

  return {
    keys,
    has(key): key is keyof M & string {
      return Object.prototype.hasOwnProperty.call(defs, key)
    },
    def,
    defaultOf,
    coerce,
  }
}
