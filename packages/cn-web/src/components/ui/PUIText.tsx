import * as React from 'react'

import { cn } from '../../lib/utils'
import { type PUITextAs, type PUITextTone, type PUITextVariant } from './PUIText.types'

export type { PUITextAs, PUITextTone, PUITextVariant } from './PUIText.types'

// Token-driven via Tailwind → @piparo/design-tokens CSS vars; theme-aware via [data-theme].
// Apple HIG type styles — type-scale class + Apple weight.
const TYPE: Record<PUITextVariant, string> = {
  largeTitle: 'text-large-title font-bold',
  title1: 'text-title-1 font-bold',
  title2: 'text-title-2 font-semibold',
  title3: 'text-title-3 font-semibold',
  headline: 'text-headline font-semibold',
  body: 'text-body font-normal',
  callout: 'text-callout font-normal',
  subheadline: 'text-subheadline font-normal',
  footnote: 'text-footnote font-normal',
  caption1: 'text-caption-1 font-normal',
  caption2: 'text-caption-2 font-normal',
}

const TONE: Record<PUITextTone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  subtle: 'text-subtle-foreground',
  inverse: 'text-inverse-foreground',
  brand: 'text-brand',
}

// Fraction of the font size to shift text down for optical vertical centering;
// derived from the SF Pro descent metric. Scales with font size, so it is
// size-relative, not an absolute px nudge. Applied as an em transform (em is
// inherently font-relative on the web, so no per-variant size map is needed).
export const OPTICAL_CENTER_RATIO = 0.13

export interface PUITextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: PUITextVariant
  tone?: PUITextTone
  /** Rendered HTML element so title variants can expose real heading semantics. */
  as?: PUITextAs
  /**
   * Shift the glyph down by a font-relative amount to optically center it inside a fixed-height
   * container, compensating the reserved descender space (the font sits visually high otherwise).
   * Use in segmented controls, buttons, chips — not for body copy.
   */
  opticalCenter?: boolean
}

/** @scope both */
export const PUIText = React.forwardRef<HTMLElement, PUITextProps>(
  (
    {
      className,
      variant = 'body',
      tone = 'default',
      as = 'span',
      opticalCenter = false,
      style,
      ...props
    },
    ref,
  ) => {
    const Component = as as React.ElementType
    // em is font-relative, so translateY(0.13em) scales with the text size; merged on top of any
    // caller-passed style (never dropping it).
    const mergedStyle = opticalCenter
      ? { ...style, transform: `translateY(${OPTICAL_CENTER_RATIO}em)` }
      : style
    return (
      <Component
        ref={ref}
        className={cn(TYPE[variant], TONE[tone], className)}
        style={mergedStyle}
        {...props}
      />
    )
  },
)
PUIText.displayName = 'PUIText'
