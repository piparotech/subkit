import * as React from 'react'

/**
 * Shared slot contract for the centered state blocks (StateBlock / EmptyState /
 * ErrorState). Keeps the icon/title/description/action surface identical across
 * the three components and across the native twin.
 */
export interface PUIStateBlockSlots {
  /** Slot rendered above the title (e.g. an icon). */
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  /** CTA slot rendered below the description, provided by the consumer. */
  action?: React.ReactNode
  /** Extra classes for the title text (e.g. feature-theme color overrides). */
  titleClassName?: string
  /** Extra classes for the description text (e.g. feature-theme color overrides). */
  descriptionClassName?: string
}
