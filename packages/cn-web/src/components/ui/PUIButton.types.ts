import { type ReactNode } from 'react'

/**
 * Emphasis hierarchy (Uber Base mapping): `default` = Uber Primary (highest emphasis), `secondary`
 * = Uber Secondary, `ghost` = Uber Tertiary (lowest emphasis), `outline` = Uber Outline, `onBrand`
 * = Uber OnBrand (membership/branded surfaces — a genuinely branded fill, `bg-brand` with an inverse
 * label, for use on a brand-colored surface), `destructive` = the dedicated danger primary. For the
 * Uber Danger *modifier* on any other type, prefer the orthogonal `danger` flag over switching to
 * `destructive`.
 */
export type PUIButtonVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'onBrand'

/** `icon` is a square size for icon-only buttons (`h-11 w-11`). `xs` is Uber xSmall (inline/supporting). */
export type PUIButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'xs'

/** Corner shape: Uber rectangular (`rounded-md`) vs. fully rounded pill (`rounded-full`) vs. square icon (`rounded-md`, square box). */
export type PUIButtonShape = 'default' | 'pill' | 'square'

/**
 * PUIButton contract, kept in parity with the native twin's co-located types (duplicated per
 * package, not a shared import) so the prop surface and variant/size unions stay in lockstep
 * across platforms (matching the PUIInput/PUIText types convention). The web twin extends this
 * with the host `<button>` attributes; the native twin (a NativeWind Pressable) reads the same
 * shape. There is no @expo/ui twin for this control.
 */
export interface PUIButtonOwnProps {
  /**
   * Button text. Accepts any ReactNode (string, `t` macro, `<Trans>`). Optional on web, where
   * `children` may be used instead; for icon-only buttons (size `icon`) pass `aria-label` for a
   * name.
   */
  label?: ReactNode
  variant?: PUIButtonVariant
  /**
   * Orthogonal Uber *Danger* modifier — tints the chosen `variant` destructive without switching
   * type. On filled types (`default`/`onBrand`) it swaps the surface to the danger surface; on the
   * quieter types (`secondary`/`outline`/`ghost`) it recolors the label/border to `destructive`.
   * The dedicated `'destructive'` variant stays the shorthand for a danger primary.
   */
  danger?: boolean
  /** `icon` is a square size for icon-only buttons (`h-11 w-11`). `xs` is Uber xSmall (inline/supporting). */
  size?: PUIButtonSize
  /**
   * Corner shape. `'default'` is Uber's rectangular control (`rounded-md`); `'pill'` is the fully
   * rounded shape (`rounded-full`); `'square'` is a square box (icon-style) that keeps the
   * rectangular corner radius. Defaults to `'default'`.
   */
  shape?: PUIButtonShape
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  addonStart?: ReactNode
  addonEnd?: ReactNode
  /** Press handler. The web twin maps this onto the DOM `onClick`. */
  onPress?: () => void
  /** Extra classes for the impl (layout/spacing). */
  className?: string
}
