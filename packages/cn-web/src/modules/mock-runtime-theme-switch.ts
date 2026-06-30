// In-memory seam for the runtime-theme-switch Engine: the storage-agnostic persistence port wired to
// an in-process key-value map (standing in for the web `localStorage` / native MMKV the host would
// adapt), plus a deterministic preset registry and a fully-populated base token set. The real,
// unchanged Engine runs on top — scheme resolution, preset merge with base fallback, versioned
// load/save — with no browser storage and no design-token package. Seeded data mirrors the native
// showcase (a Base preset plus brand presets) so both showcases tell one story.
import type { PreferenceStorage, ThemeColors, ThemePreset } from '@/lib/runtime-theme-switch'

/** The key the demo persists its preference under (the module's default `persistKey`). */
export const MOCK_PERSIST_KEY = 'runtime-theme-switch'

/**
 * A synchronous in-memory `PreferenceStorage` — the exact port the Engine's load/save seam expects.
 * Seedable so a story can simulate "a returning visitor whose choice survived a page reload".
 */
export function createMockPreferenceStorage(seed?: Record<string, string>): PreferenceStorage {
  const map = new Map<string, string>(Object.entries(seed ?? {}))
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  }
}

/**
 * The fully-populated base token set every preset merges onto. Values are the CSS-var names the
 * cn-web design tokens already define, so the Shell can hand any resolved tone straight to a CSS
 * custom property. The override presets below are deliberately SPARSE to exercise the fallback NFR:
 * an unspecified role resolves to its value here instead of breaking.
 */
export const BASE_THEME_COLORS: ThemeColors = {
  action: {
    primary: {
      background: 'var(--color-action-primary-background)',
      foreground: 'var(--color-action-primary-foreground)',
      hover: 'var(--color-action-primary-hover)',
    },
    secondary: {
      background: 'var(--color-action-secondary-background)',
      foreground: 'var(--color-action-secondary-foreground)',
      hover: 'var(--color-action-secondary-hover)',
    },
    ghost: {
      background: 'var(--color-action-ghost-background)',
      foreground: 'var(--color-action-ghost-foreground)',
      hover: 'var(--color-action-ghost-hover)',
    },
  },
  background: { default: 'var(--color-background-default)' },
  foreground: {
    default: 'var(--color-foreground-default)',
    brand: 'var(--color-foreground-brand)',
  },
  border: { focus: 'var(--color-border-focus)' },
  intent: {
    danger: {
      background: 'var(--color-intent-danger-background)',
      foreground: 'var(--color-intent-danger-foreground)',
      hover: 'var(--color-intent-danger-background)',
    },
    success: {
      background: 'var(--color-intent-success-background)',
      foreground: 'var(--color-intent-success-foreground)',
      hover: 'var(--color-intent-success-background)',
    },
    warning: {
      background: 'var(--color-intent-warning-background)',
      foreground: 'var(--color-intent-warning-foreground)',
      hover: 'var(--color-intent-warning-background)',
    },
  },
}

/**
 * The seeded preset registry. `base` carries no override (the unmodified design tokens); the brand
 * presets override only the primary action + brand foreground per scheme, leaving every other role
 * to fall through to BASE_THEME_COLORS — exactly the sparse-override path the NFR protects.
 */
export const SEEDED_PRESETS: readonly ThemePreset[] = [
  {
    id: 'base',
    label: 'piparo',
    swatch: '#4764c6',
    tokens: { light: {}, dark: {} },
  },
  {
    id: 'violet',
    label: 'Violet',
    swatch: '#7c3aed',
    tokens: {
      light: {
        action: { primary: { background: '#7c3aed', foreground: '#ffffff', hover: '#6d28d9' } },
        foreground: { brand: '#7c3aed' },
        border: { focus: '#7c3aed' },
      },
      dark: {
        action: { primary: { background: '#a78bfa', foreground: '#1e1b2e', hover: '#c4b5fd' } },
        foreground: { brand: '#c4b5fd' },
        border: { focus: '#a78bfa' },
      },
    },
  },
  {
    id: 'teal',
    label: 'Teal',
    swatch: '#0d9488',
    tokens: {
      light: {
        action: { primary: { background: '#0d9488', foreground: '#ffffff', hover: '#0f766e' } },
        foreground: { brand: '#0d9488' },
        border: { focus: '#0d9488' },
      },
      dark: {
        action: { primary: { background: '#2dd4bf', foreground: '#042f2a', hover: '#5eead4' } },
        foreground: { brand: '#5eead4' },
        border: { focus: '#2dd4bf' },
      },
    },
  },
]

/** The base preset id used as the safe fallback target when an unknown id is selected. */
export const BASE_PRESET_ID = 'base'
