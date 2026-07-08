import * as React from 'react'

import { ChevronRight, Inbox } from 'lucide-react'

import { cn } from '../../lib/utils'
import { PUIEmptyState } from './PUIEmptyState'
import { PUIErrorState } from './PUIErrorState'
import { PUISkeleton } from './PUISkeleton'

export interface PUIListProps extends React.HTMLAttributes<HTMLUListElement> {
  children: React.ReactNode
  /** Show skeleton rows instead of content (data still loading). Wins over `error`/empty. */
  loading?: boolean
  /** Number of skeleton rows to render while `loading`. Defaults to `3`. */
  loadingRows?: number
  /**
   * Error to surface instead of content. `true` renders the default PUIErrorState;
   * a node replaces it entirely. Pair `errorAction` for a consumer-provided retry CTA.
   */
  error?: boolean | React.ReactNode
  /** Retry CTA rendered inside the default error state (e.g. a PUIButton). Ignored when `error` is a node. */
  errorAction?: React.ReactNode
  /**
   * Announce the default error assertively (`role="alert"`) instead of politely
   * (`role="status"`). Default false. Ignored when `error` is a node.
   */
  errorAssertive?: boolean
  /**
   * Shown when there are no item/section children and the list is not loading/in error.
   * Provide a node to override the default PUIEmptyState.
   */
  emptyState?: React.ReactNode
}

const DEFAULT_LOADING_ROWS = 3

function ListStateWrapper({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-border bg-card overflow-hidden rounded-xl border', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Bordered, divider-separated list container (compose with PUIListSection / PUIListItem).
 *
 * Carries the loading / error / empty states: `loading` shows skeleton rows,
 * `error` composes PUIErrorState, and an absence of item/section children composes
 * PUIEmptyState. Each is overridable by the consumer.
 *
 * @scope both
 */
export const PUIList = React.forwardRef<HTMLUListElement, PUIListProps>(
  (
    {
      children,
      loading = false,
      loadingRows = DEFAULT_LOADING_ROWS,
      error = false,
      errorAction,
      errorAssertive = false,
      emptyState,
      className,
      ...props
    },
    ref,
  ) => {
    if (loading) {
      return (
        <ListStateWrapper aria-busy className={className}>
          <ListSkeletonRows rows={loadingRows} />
        </ListStateWrapper>
      )
    }

    if (error) {
      return (
        <ListStateWrapper className={className}>
          {React.isValidElement(error) ? (
            error
          ) : (
            <PUIErrorState
              action={errorAction}
              assertive={errorAssertive}
              description="The list could not be loaded."
              title="Something went wrong"
            />
          )}
        </ListStateWrapper>
      )
    }

    if (!hasChildren(children)) {
      return (
        <ListStateWrapper className={className}>
          {emptyState ?? (
            <PUIEmptyState
              description="There is nothing here yet."
              icon={<Inbox aria-hidden className="text-muted-foreground size-8" />}
              title="Nothing here"
            />
          )}
        </ListStateWrapper>
      )
    }

    return (
      <ul
        className={cn(
          'border-border bg-card m-0 list-none overflow-hidden rounded-xl border p-0',
          className,
        )}
        ref={ref}
        {...props}
      >
        {withDividers(children)}
      </ul>
    )
  },
)
PUIList.displayName = 'PUIList'

function ListSkeletonRows({ rows }: { rows: number }) {
  return (
    <div aria-label="Loading" role="status">
      {Array.from({ length: Math.max(1, rows) }).map((_, index) => (
        <div
          className={cn('flex items-center gap-3 px-4 py-3', index > 0 && 'border-border border-t')}
          key={`skeleton-${index}`}
        >
          <PUISkeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <PUISkeleton className="h-3.5 w-2/5" />
            <PUISkeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

export interface PUIListSectionProps extends React.HTMLAttributes<HTMLLIElement> {
  /** Optional header label rendered above the grouped rows. */
  header?: React.ReactNode
  children: React.ReactNode
}

export const PUIListSection = React.forwardRef<HTMLLIElement, PUIListSectionProps>(
  ({ header, children, className, ...props }, ref) => {
    const labelId = React.useId()
    return (
      <li className={cn(className)} ref={ref} {...props}>
        {header != null ? (
          <div
            className="text-footnote text-muted-foreground px-4 pt-4 pb-1.5 font-semibold tracking-wide uppercase"
            id={labelId}
          >
            {header}
          </div>
        ) : null}
        <ul aria-labelledby={header != null ? labelId : undefined} className="m-0 list-none p-0">
          {withDividers(children)}
        </ul>
      </li>
    )
  },
)
PUIListSection.displayName = 'PUIListSection'

export interface PUIListItemProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Leading element (icon, avatar, …) rendered before the text block. */
  leading?: React.ReactNode
  /** Trailing element rendered after the text block (before the chevron, if any). */
  trailing?: React.ReactNode
  /** Makes the row a button. A chevron is shown unless `showChevron={false}`. */
  onPress?: () => void
  /** Force-show or hide the trailing chevron. Defaults to true when `onPress` is set. */
  showChevron?: boolean
  disabled?: boolean
  className?: string
}

function ListItemBody({
  title,
  subtitle,
  leading,
  trailing,
  showChevron,
  pressable,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  leading?: React.ReactNode
  trailing?: React.ReactNode
  showChevron: boolean
  pressable: boolean
}) {
  return (
    <>
      {leading != null ? <span className="shrink-0 self-start pt-0.5">{leading}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body text-foreground">{title}</span>
        {subtitle != null ? (
          <span className="text-footnote text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      {trailing != null ? <span className="shrink-0 self-center">{trailing}</span> : null}
      {pressable && showChevron ? (
        <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0 self-center" />
      ) : null}
    </>
  )
}

const ROW = 'flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left'

export const PUIListItem = React.forwardRef<HTMLLIElement, PUIListItemProps>(
  (
    { title, subtitle, leading, trailing, onPress, showChevron, disabled = false, className },
    ref,
  ) => {
    const pressable = onPress != null
    const chevron = showChevron ?? pressable

    return (
      <li className={cn('flex', className)} ref={ref}>
        {pressable ? (
          <button
            className={cn(
              ROW,
              'hover:bg-muted focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
            disabled={disabled}
            onClick={onPress}
            type="button"
          >
            <ListItemBody
              leading={leading}
              pressable
              showChevron={chevron}
              subtitle={subtitle}
              title={title}
              trailing={trailing}
            />
          </button>
        ) : (
          <div className={cn(ROW, disabled && 'opacity-50')}>
            <ListItemBody
              leading={leading}
              pressable={false}
              showChevron={false}
              subtitle={subtitle}
              title={title}
              trailing={trailing}
            />
          </div>
        )}
      </li>
    )
  },
)
PUIListItem.displayName = 'PUIListItem'

function hasChildren(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some(React.isValidElement)
}

function withDividers(children: React.ReactNode) {
  const items = React.Children.toArray(children).filter(React.isValidElement)
  return items.flatMap((child, index) =>
    index === 0
      ? [child]
      : [
          <li aria-hidden className="bg-border mx-4 h-px" key={`divider-${index}`} role="none" />,
          child,
        ],
  )
}
