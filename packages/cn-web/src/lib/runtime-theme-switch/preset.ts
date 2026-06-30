// The preset registry + the base-token fallback merge — the runtime-theme-switch Engine's heart.
//
// A `ThemeOverride` is a DEEP-PARTIAL of the design-token color set (it mirrors cn-native's
// `ThemeOverride`): any role may be supplied, any may be omitted. The capability NFR ("if no value
// is present for a token role, the display falls back to the base token instead of breaking") is
// realised by `resolvePresetTokens`, which deep-merges a (possibly sparse) preset override onto a
// fully-populated base set — every unspecified role falls through to the base. This is pure and
// isomorphic; the React Shell feeds the result to cn-native's ThemeProvider.

export type Scheme = 'light' | 'dark'

/** One action/intent variant — background/foreground/hover; any subset may be overridden. */
export type ToneOverride = { background?: string; foreground?: string; hover?: string }

/** A deep-partial of the token color set. Mirrors cn-native's ThemeOverride. */
export type ThemeOverride = {
  action?: { primary?: ToneOverride; secondary?: ToneOverride; ghost?: ToneOverride }
  background?: Record<string, string>
  foreground?: Record<string, string>
  border?: Record<string, string>
  intent?: { danger?: ToneOverride; success?: ToneOverride; warning?: ToneOverride }
}

/** A fully-populated tone (the base always provides every value). */
export type Tone = { background: string; foreground: string; hover: string }

/** The fully-populated token color set a base theme must supply (per scheme). */
export type ThemeColors = {
  action: { primary: Tone; secondary: Tone; ghost: Tone }
  background: Record<string, string>
  foreground: Record<string, string>
  border: Record<string, string>
  intent: { danger: Tone; success: Tone; warning: Tone }
}

/** A selectable preset: a per-scheme override on the shared base token set. */
export type ThemePreset = {
  id: string
  label: string
  /** A representative color for a swatch in the picker. */
  swatch: string
  tokens: { light: ThemeOverride; dark: ThemeOverride }
}

const mergeTone = (base: Tone, o?: ToneOverride): Tone => (o ? { ...base, ...o } : base)

/**
 * Deep-merge a (sparse) ThemeOverride onto a fully-populated base color set. Every role the
 * override omits falls through to the base — the display never lands on `undefined`. This is the
 * executable form of the fallback NFR.
 */
export function resolvePresetTokens(base: ThemeColors, override: ThemeOverride): ThemeColors {
  return {
    action: {
      primary: mergeTone(base.action.primary, override.action?.primary),
      secondary: mergeTone(base.action.secondary, override.action?.secondary),
      ghost: mergeTone(base.action.ghost, override.action?.ghost),
    },
    background: { ...base.background, ...override.background },
    foreground: { ...base.foreground, ...override.foreground },
    border: { ...base.border, ...override.border },
    intent: {
      danger: mergeTone(base.intent.danger, override.intent?.danger),
      success: mergeTone(base.intent.success, override.intent?.success),
      warning: mergeTone(base.intent.warning, override.intent?.warning),
    },
  }
}

/** The empty override — the unmodified base theme. */
export const BASE_PRESET_TOKENS: ThemeOverride = {}

/**
 * Resolve a preset by id from a registry, falling back to a designated base preset (or the empty
 * override) when the id is unknown — selecting a preset can never break the app.
 */
export function resolvePreset(
  presets: readonly ThemePreset[],
  id: string,
  baseId?: string,
): ThemePreset {
  const found = presets.find((p) => p.id === id)
  if (found) return found
  const base = baseId ? presets.find((p) => p.id === baseId) : undefined
  return (
    base ??
    presets[0] ?? {
      id: baseId ?? 'base',
      label: 'Base',
      swatch: '',
      tokens: { light: {}, dark: {} },
    }
  )
}

/** Pick the override for the active scheme from a preset. */
export function presetOverride(preset: ThemePreset, scheme: Scheme): ThemeOverride {
  return preset.tokens[scheme]
}
