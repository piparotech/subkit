import * as React from 'react'

import { cn } from '../../lib/utils'

export type PUICardMediaPosition = 'top' | 'bottom' | 'background'

export interface PUICardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * A media block (image/illustration/gradient). Positioned per `mediaPosition`: `top`/`bottom`
   * stack it flush outside the body (clipped to the rounded corners); `background` bleeds it behind
   * the content. "Media middle" is composition: place the media between PUICardContent blocks in
   * `children`.
   */
  media?: React.ReactNode
  /** @default 'top' */
  mediaPosition?: PUICardMediaPosition
  /** A small node pinned to the body's top-right, beside the heading (Uber "artwork trailing"). */
  artwork?: React.ReactNode
}

/** @scope both */
export const PUICard = React.forwardRef<HTMLDivElement, PUICardProps>(
  ({ className, children, media, mediaPosition = 'top', artwork, ...props }, ref) => {
    const body =
      artwork != null ? (
        <div className="relative">
          <div className="absolute top-4 right-4 z-10">{artwork}</div>
          {children}
        </div>
      ) : (
        children
      )

    if (media != null && mediaPosition === 'background') {
      return (
        <div
          ref={ref}
          className={cn(
            'border-border bg-card text-card-foreground relative overflow-hidden rounded-xl border',
            className,
          )}
          {...props}
        >
          <div className="absolute inset-0">{media}</div>
          <div className="relative z-10">{children}</div>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'border-border bg-card text-card-foreground rounded-xl border',
          media != null && 'overflow-hidden',
          className,
        )}
        {...props}
      >
        {media != null && mediaPosition === 'top' ? media : null}
        {body}
        {media != null && mediaPosition === 'bottom' ? media : null}
      </div>
    )
  },
)
PUICard.displayName = 'PUICard'

export const PUICardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-2 px-5 pt-5 pb-4', className)} {...props} />
  ),
)
PUICardHeader.displayName = 'PUICardHeader'

export const PUICardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-title-3 text-foreground font-semibold tracking-tight', className)}
      {...props}
    />
  ),
)
PUICardTitle.displayName = 'PUICardTitle'

export const PUICardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-footnote text-muted-foreground', className)} {...props} />
))
PUICardDescription.displayName = 'PUICardDescription'

export const PUICardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-5 pb-5', className)} {...props} />
))
PUICardContent.displayName = 'PUICardContent'

export const PUICardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-3 px-5 pb-5', className)} {...props} />
  ),
)
PUICardFooter.displayName = 'PUICardFooter'
