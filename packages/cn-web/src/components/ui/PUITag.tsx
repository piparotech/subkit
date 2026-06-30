import { cva } from 'class-variance-authority'
import { X } from 'lucide-react'

import { cn } from '../../lib/utils'
import { type PUITagIntent, type PUITagProps, type PUITagSize } from './PUITag.types'

export type { PUITagEmphasis, PUITagIntent, PUITagProps, PUITagSize } from './PUITag.types'

const SIZE_BOX: Record<PUITagSize, string> = {
  sm: 'h-6 gap-1 px-2 text-caption-2',
  md: 'h-7 gap-1.5 px-2.5 text-footnote',
  lg: 'h-9 gap-2 px-3 text-footnote',
}

const ICON_SIZE: Record<PUITagSize, number> = { sm: 14, md: 16, lg: 18 }
const REMOVE_SIZE: Record<PUITagSize, number> = { sm: 14, md: 16, lg: 16 }

// soft = the intent tints the surface and the label rides the matching intent hue; solid = the
// whole pill carries the intent color with on-color text. Tokens only, never a raw hex.
const tagVariants = cva(
  'inline-flex max-w-full items-center self-start whitespace-nowrap rounded-full font-medium',
  {
    variants: {
      intent: {
        neutral: '',
        primary: '',
        success: '',
        warning: '',
        destructive: '',
      } satisfies Record<PUITagIntent, string>,
      emphasis: { soft: '', solid: '' },
      size: { sm: SIZE_BOX.sm, md: SIZE_BOX.md, lg: SIZE_BOX.lg },
    },
    compoundVariants: [
      { intent: 'neutral', emphasis: 'soft', class: 'bg-muted text-foreground' },
      { intent: 'primary', emphasis: 'soft', class: 'bg-primary/10 text-primary' },
      { intent: 'success', emphasis: 'soft', class: 'bg-success/10 text-success' },
      { intent: 'warning', emphasis: 'soft', class: 'bg-warning/10 text-warning' },
      {
        intent: 'destructive',
        emphasis: 'soft',
        class: 'bg-destructive/10 text-destructive',
      },
      { intent: 'neutral', emphasis: 'solid', class: 'bg-foreground text-background' },
      {
        intent: 'primary',
        emphasis: 'solid',
        class: 'bg-primary text-primary-foreground',
      },
      {
        intent: 'success',
        emphasis: 'solid',
        class: 'bg-success text-success-foreground',
      },
      {
        intent: 'warning',
        emphasis: 'solid',
        class: 'bg-warning text-warning-foreground',
      },
      {
        intent: 'destructive',
        emphasis: 'solid',
        class: 'bg-destructive text-destructive-foreground',
      },
    ],
    defaultVariants: { intent: 'neutral', emphasis: 'soft', size: 'md' },
  },
)

/**
 * Tag (chip / lozenge): a compact label that shows an element's status, key properties, or
 * category, optionally with a leading icon and a removable trailing X. The web twin of the native
 * `PUITag`; the native `display`/`selection` + animated toggle axis lives only on the touch
 * platform, so this web port is the static, removable subset. A static label without a remove
 * action is a `PUIBadge`; the Tag adds the user-removable affordance.
 *
 * It hugs its content (`self-start`, `max-w-full`), never wraps (`whitespace-nowrap`), and
 * truncates its label at the layout edge. Color comes from `intent` x `emphasis` (design tokens
 * only): `soft` rides a tinted fill with matching ink, `solid` fills the whole pill with on-color
 * text. The trailing remove is a real `button` with a `Remove <label>` aria-label, a min 44px hit
 * area via `before:`, a `focus-visible` ring, and a hover wash; `motion-reduce` keeps the color
 * transition off. `disabled` dims to 50% and blocks the remove.
 *
 * @scope both
 */
export function PUITag({
  label,
  intent = 'neutral',
  emphasis = 'soft',
  size = 'md',
  leadingIcon: LeadingIcon,
  onRemove,
  disabled = false,
  className,
}: PUITagProps) {
  const removable = onRemove != null
  const ICON = ICON_SIZE[size]

  return (
    <span
      className={cn(tagVariants({ intent, emphasis, size }), disabled && 'opacity-50', className)}
    >
      {LeadingIcon != null ? (
        <LeadingIcon aria-hidden className="shrink-0" size={ICON} strokeWidth={2} />
      ) : null}
      <span className="min-w-0 truncate">{label}</span>
      {removable ? (
        <button
          aria-label={`Remove ${typeof label === 'string' ? label : 'tag'}`}
          className={cn(
            'relative -mr-1 inline-flex shrink-0 items-center justify-center rounded-full p-0.5',
            'duration-fast hover:bg-foreground/10 transition-colors motion-reduce:transition-none',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            // Invisible 44px hit area centred on the glyph without inflating the pill.
            'before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[""]',
            'disabled:pointer-events-none',
          )}
          disabled={disabled}
          onClick={onRemove}
          type="button"
        >
          <X aria-hidden size={REMOVE_SIZE[size]} strokeWidth={2.25} />
        </button>
      ) : null}
    </span>
  )
}
PUITag.displayName = 'PUITag'
