import { z } from 'zod'

/**
 * The `runtime-theme-switch` module's `config.schema` — the host-controlled knobs for the runtime
 * theme/dark-mode switcher. The token VALUES of presets are app design substance (supplied by the
 * Shell's preset registry); this config only carries the cross-cutting policy: the initial scheme,
 * whether the preset picker is offered, and the persistence key.
 */

const ColorSchemePreference = z.enum(['system', 'light', 'dark'])

export const RuntimeThemeSwitchConfig = z.strictObject({
  /** The scheme preference applied before the user chooses one. */
  defaultColorScheme: ColorSchemePreference.default('system'),
  /** Whether the appearance control offers the System option (vs. light/dark only). */
  allowSystem: z.boolean().default(true),
  /** Whether a brand-preset picker is shown alongside the light/dark control. */
  allowPresets: z.boolean().default(true),
  /** The preset selected before the user chooses one. */
  defaultThemeId: z.string().min(1).default('base'),
  /** Storage key under which the preference is persisted. */
  persistKey: z.string().min(1).default('runtime-theme-switch'),
})
export type RuntimeThemeSwitchConfig = z.infer<typeof RuntimeThemeSwitchConfig>

export type EditableBy = 'piparo' | 'customer'

/** Every config path mapped to who may edit it. */
export const runtimeThemeSwitchConfigRights: Record<keyof RuntimeThemeSwitchConfig, EditableBy> = {
  defaultColorScheme: 'customer',
  allowSystem: 'piparo',
  allowPresets: 'piparo',
  defaultThemeId: 'customer',
  persistKey: 'piparo',
}

export function parseRuntimeThemeSwitchConfig(input: unknown) {
  return RuntimeThemeSwitchConfig.safeParse(input)
}
