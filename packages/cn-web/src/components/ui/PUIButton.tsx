import * as React from 'react'

import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '../../lib/utils'
import {
  type PUIButtonOwnProps,
  type PUIButtonShape,
  type PUIButtonSize,
  type PUIButtonVariant,
} from './PUIButton.types'

export type { PUIButtonShape, PUIButtonSize, PUIButtonVariant }

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-callout font-semibold transition-colors duration-fast motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
        outline: 'border border-border bg-background text-foreground hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        // Uber OnBrand = a genuinely branded fill (the `brand` token, not the neutral `accent`
        // surface) with an inverse label so it reads on a brand-colored surface.
        onBrand: 'bg-brand text-inverse-foreground hover:opacity-90',
      },
      // Box model intentionally diverges from the native SIZE_BOX (cn-native PUIButton): the web box
      // uses a tighter horizontal inset (sm/default `px-3`/`px-4` vs native `px-4`/`px-5`) and leans
      // on line-box height rather than the explicit `py` native sets, since the DOM button's content
      // box already centers the label. Heights and the per-size type scale stay in parity.
      size: {
        // The native twin keeps a 36pt visual box for xs/sm and restores the 44pt floor with a
        // top/bottom hitSlop (SIZE_HIT_SLOP). The web has no hitSlop: the rendered box IS the real
        // clickable target, so a 36px-tall button would miss the 44px / WCAG 2.5.8 floor. Keep the
        // box at min-h-11 (matching PUIButtonGroup's sm), and let the smaller type carry the density.
        xs: 'min-h-11 px-3 text-footnote',
        sm: 'min-h-11 px-3 text-subheadline',
        default: 'min-h-11 px-4 py-2',
        lg: 'min-h-12 px-6 text-body',
        icon: 'h-11 w-11',
      },
      shape: {
        default: 'rounded-lg',
        pill: 'rounded-full',
        // Square (icon-style) keeps the rectangular corner radius but forces a square box.
        square: 'aspect-square rounded-md px-0',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'default',
      fullWidth: false,
    },
  },
)

// Which variants paint a filled surface. Danger overlays the chosen variant: filled types swap the
// surface to the danger surface, the quieter (text/border-led) types recolor label/border instead.
const FILLED: Record<PUIButtonVariant, boolean> = {
  default: true,
  secondary: false,
  destructive: true,
  outline: false,
  ghost: false,
  onBrand: true,
}

export interface PUIButtonProps
  extends
    PUIButtonOwnProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled' | 'children'> {
  /** Render the child element as the button (Radix Slot). Web-only composition escape hatch. */
  asChild?: boolean
  /** Web-only convenience: use children instead of `label`. */
  children?: React.ReactNode
}

/**
 * Token-driven button, the web twin of native PUIButton (ADR 0023 Tier 1 — Primitive: full
 * parity, same `PUI` name + API + token-driven look on both platforms). Shares the native prop
 * surface (`label`/`variant`/`danger`/`size`/`shape`/`loading`/`addonStart`/`addonEnd`/`fullWidth`/
 * `onPress`) via the co-located `PUIButton.types` contract kept identical to native; `onPress` maps
 * onto the DOM `onClick`. Web keeps two web-only escape hatches: `children` (alias for `label`) and
 * `asChild` (Slot).
 *
 * Emphasis hierarchy maps onto Uber Base (`default`=Primary, `secondary`=Secondary, `ghost`=
 * Tertiary, `outline`=Outline, `onBrand`=OnBrand for a brand-colored surface, `destructive`=danger
 * primary), with an orthogonal `danger` modifier for the Uber Danger look on any other type. Hover
 * deepens the brand fill (`hover:bg-primary-hover`/`hover:bg-secondary-hover`); the filled
 * destructive/onBrand surfaces have no hover token so they soften (`hover:opacity-90`). Shapes:
 * `default` rectangular (`rounded-lg`), `pill` fully rounded, `square` an icon-style square box.
 * Icon-only buttons (size `icon`, shape `square`, or no label) must pass `aria-label` for an
 * accessible name; it is forwarded to the host element via `...props`. In dev a button with no
 * `label`/`children` text and no `aria-label`/`aria-labelledby` logs a `console.warn` (WCAG 4.1.2).
 *
 * @scope both
 */
export const PUIButton = React.forwardRef<HTMLButtonElement, PUIButtonProps>(
  (
    {
      label,
      children,
      variant = 'default',
      danger = false,
      size,
      shape,
      loading = false,
      disabled = false,
      fullWidth = false,
      addonStart,
      addonEnd,
      onPress,
      asChild = false,
      className,
      ...props
    },
    ref,
  ) => {
    if (
      process.env.NODE_ENV !== 'production' &&
      label == null &&
      children == null &&
      props['aria-label'] == null &&
      props['aria-labelledby'] == null
    ) {
      console.warn(
        'PUIButton: no `label`/`children` text and no `aria-label`/`aria-labelledby` — an icon-only button has no accessible name (WCAG 4.1.2). Pass `aria-label` so screen readers can announce what it does.',
      )
    }
    const isInactive = disabled || loading
    const isFilled = FILLED[variant]
    // Danger overlays the chosen variant: filled types swap their surface to the danger surface,
    // quieter (text/border-led) types just recolor label + border to `destructive`.
    const dangerClasses = danger
      ? isFilled
        ? // hover:bg-destructive replaces the variant's hover background (e.g. hover:bg-primary-hover)
          // so a danger fill never re-tints to its base color on hover; hover:opacity-90 softens it.
          'bg-destructive text-destructive-foreground border-transparent hover:bg-destructive hover:opacity-90'
        : cn('text-destructive', variant === 'outline' && 'border-destructive')
      : undefined
    const classes = cn(
      buttonVariants({ variant, size, shape, fullWidth }),
      dangerClasses,
      className,
    )
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(classes, isInactive && 'pointer-events-none')}
          {...props}
          // Spread `props` first so the guard props below cannot be clobbered by caller-passed
          // handlers. `pointer-events-none` blocks mouse/pointer only; a slotted focusable child
          // (e.g. <a href>) stays tab-focusable, so when inactive also drop it from the tab order,
          // gate the click handler, and swallow Enter/Space — otherwise a "disabled"/"loading"
          // asChild button is still keyboard-operable and would fire `onPress`.
          aria-busy={loading || undefined}
          aria-disabled={isInactive}
          data-disabled={isInactive ? '' : undefined}
          onClick={isInactive ? undefined : onPress}
          onKeyDown={
            isInactive
              ? (event: React.KeyboardEvent) => {
                  if (event.key === 'Enter' || event.key === ' ') event.preventDefault()
                }
              : props.onKeyDown
          }
          tabIndex={isInactive ? -1 : props.tabIndex}
        >
          {children}
        </Slot>
      )
    }
    return (
      <button
        ref={ref}
        aria-busy={loading || undefined}
        className={classes}
        disabled={isInactive}
        onClick={onPress}
        type="button"
        {...props}
      >
        {loading ? (
          <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
        ) : (
          addonStart
        )}
        {label ?? children}
        {loading ? null : addonEnd}
      </button>
    )
  },
)
PUIButton.displayName = 'PUIButton'
