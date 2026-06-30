import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Register the design-token scales with tailwind-merge so conflicting utilities dedupe to the
// last one (and a consumer `className` reliably overrides a component's base classes). Each
// `theme` key feeds every related class group at once: `text` -> font-size groups,
// `spacing` -> p/m/gap/w/h/inset/…, `radius` -> rounded-*.
//
// Without this, twMerge lumps custom utilities into the wrong group — e.g. a later text COLOR
// would silently drop the type-scale SIZE (`text-caption-1`), and custom `px-*`/`rounded-*`
// overrides would not dedupe at all.
const TYPE_SCALE = [
  'large-title',
  'title-1',
  'title-2',
  'title-3',
  'headline',
  'body',
  'callout',
  'subheadline',
  'footnote',
  'caption-1',
  'caption-2',
]

const SPACING_SCALE = [
  'none',
  'hairline',
  'xxs',
  'xs',
  'sm',
  'control',
  'md',
  'lg',
  'xl',
  'xxl',
  'xxxl',
  'section-sm',
  'section-md',
  'touch',
  'control-sm',
  'control-lg',
  'icon-sm',
  'icon-md',
  'icon-lg',
  'brand-sm',
  'brand-md',
  'avatar-sm',
  'avatar-md',
  'avatar-lg',
  'avatar-profile',
  'sheet-lg',
  'toast-top',
  'toast-bottom',
  'search-offset',
  'screen-bottom',
  'skeleton-xs',
  'skeleton-sm',
  'skeleton-md',
  'skeleton-lg',
  'skeleton-xl',
  'skeleton-xxl',
  'popover-md',
  'popover-lg',
  'menu-md',
  'menu-lg',
  'tooltip-md',
  'tooltip-lg',
  'dialog-lg',
  'logo-wordmark-height',
  'logo-wordmark-width',
]

const RADIUS_SCALE = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'xxl', 'pill', 'sheet-top']
const OPACITY_SCALE = [
  'hidden',
  'disabled',
  'unavailable',
  'muted',
  'pressed',
  'resting',
  'subtle',
  'full',
]

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: TYPE_SCALE,
      spacing: SPACING_SCALE,
      radius: RADIUS_SCALE,
    },
    classGroups: {
      opacity: [{ opacity: OPACITY_SCALE }],
      'border-w': [{ border: ['token', 'strong'] }],
      'border-w-t': [{ 'border-t': ['token'] }],
      'border-w-r': [{ 'border-r': ['token'] }],
      'border-w-b': [{ 'border-b': ['token'] }],
      'border-w-l': [{ 'border-l': ['token'] }],
    },
  },
})

export type { ClassValue }

/** Merge className fragments with Tailwind conflict resolution + the design-token scales. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
