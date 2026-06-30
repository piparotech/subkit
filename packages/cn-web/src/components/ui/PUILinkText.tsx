import * as React from 'react'

import { cn } from '../../lib/utils'
import { type PUILinkTextBaseProps, type PUILinkTextTone } from './PUILinkText.types'

export type { PUILinkTextBaseProps, PUILinkTextTone } from './PUILinkText.types'

export interface PUILinkTextProps extends PUILinkTextBaseProps {
  /** Web handler (native twin: `onPress`). Wired on the rendered element (button or anchor). */
  onClick?: () => void
}

const TONES: Record<PUILinkTextTone, string> = {
  brand: 'text-brand',
  default: 'text-foreground',
}

/**
 * Inline/standalone hyperlink. Splits navigation (href) from action (onClick).
 *
 * @scope both
 */
export const PUILinkText = React.forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  PUILinkTextProps
>(function PUILinkText(
  { children, onClick, href, tone = 'brand', disabled = false, className },
  ref,
) {
  const classes = cn(
    'underline underline-offset-2 rounded-sm hover:opacity-80 transition-opacity motion-reduce:transition-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:opacity-50 disabled:pointer-events-none',
    TONES[tone],
    className,
  )

  if (href != null && !disabled) {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={classes}
        href={href}
        onClick={onClick}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
})
PUILinkText.displayName = 'PUILinkText'
