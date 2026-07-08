import * as React from 'react'

import { cn } from '../../lib/utils'

export interface PUICarouselProps {
  /** Slides to page through. Use this or `children` (children win when both given). */
  items?: React.ReactNode[]
  /** Slides as children (each direct child becomes one slide). */
  children?: React.ReactNode
  /** Show the bottom dot indicators reflecting the active slide. Default true. */
  showIndicators?: boolean
  /** Wrap from the last slide back to the first (and vice-versa) when jumping via dots/keys. Default false. */
  loop?: boolean
  /** Accessible label for the carousel group. */
  'aria-label'?: string
  className?: string
}

/**
 * Horizontally paged content built on CSS scroll-snap (no carousel library). The active slide is
 * derived from the scroll position; dot indicators (active = bg-primary, inactive = bg-muted) jump
 * to a slide and ArrowLeft/ArrowRight page through. The scroll track is the focusable, keyboard-paged
 * surface (tabIndex=0); the dots are plain labelled buttons (APG carousel pattern), not a tablist.
 * Each slide carries aria-roledescription="slide" + its position; the container is role="group".
 * Token classes only.
 *
 * @scope both
 */
export function PUICarousel({
  items,
  children,
  showIndicators = true,
  loop = false,
  'aria-label': ariaLabel = 'Carousel',
  className,
}: PUICarouselProps) {
  const slides = items ?? React.Children.toArray(children)
  const count = slides.length
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [index, setIndex] = React.useState(0)

  const onScroll = React.useCallback(() => {
    const el = trackRef.current
    if (!el || el.clientWidth === 0) return
    const next = Math.round(el.scrollLeft / el.clientWidth)
    setIndex((prev) => (prev === next ? prev : Math.max(0, Math.min(count - 1, next))))
  }, [count])

  const goTo = React.useCallback(
    (target: number) => {
      const el = trackRef.current
      if (!el || count === 0) return
      const clamped = loop ? (target + count) % count : Math.max(0, Math.min(count - 1, target))
      el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
      setIndex(clamped)
    },
    [count, loop],
  )

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goTo(index + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goTo(index - 1)
      }
    },
    [goTo, index],
  )

  if (count === 0) return null

  return (
    <div
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      className={cn('flex flex-col gap-3', className)}
      role="group"
    >
      <div
        ref={trackRef}
        aria-label={`${ariaLabel}, slide ${index + 1} of ${count}`}
        aria-live="polite"
        className="focus-visible:ring-ring flex w-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto scroll-smooth focus-visible:ring-2 focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
        onKeyDown={onKeyDown}
        onScroll={onScroll}
        tabIndex={0}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            aria-label={`${i + 1} of ${count}`}
            aria-roledescription="slide"
            className="w-full shrink-0 snap-start snap-always"
            role="group"
          >
            {slide}
          </div>
        ))}
      </div>

      {showIndicators && count > 1 ? (
        <div
          aria-label="Slide indicators"
          className="flex items-center justify-center"
          role="group"
        >
          {slides.map((_, i) => {
            const active = i === index
            return (
              <button
                key={i}
                aria-current={active ? 'true' : undefined}
                aria-label={`Go to slide ${i + 1} of ${count}`}
                className="group focus-visible:ring-ring flex min-h-11 items-center justify-center rounded-full px-2 focus-visible:ring-2 focus-visible:outline-none"
                onClick={() => goTo(i)}
                type="button"
              >
                <span
                  className={cn(
                    'duration-normal ease-decelerate h-1.5 rounded-full transition-all motion-reduce:transition-none',
                    active ? 'bg-primary w-4' : 'bg-muted group-hover:bg-muted-foreground/40 w-1.5',
                  )}
                />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
