import * as React from 'react'

import { ChevronDown } from 'lucide-react'

import { cn } from '../../lib/utils'
import { type PUIAccordionItem, type PUIAccordionProps } from './PUIAccordion.types'

export type {
  PUIAccordionItem,
  PUIAccordionProps,
  PUIAccordionSingleProps,
  PUIAccordionMultipleProps,
} from './PUIAccordion.types'

function useAccordionState(props: PUIAccordionProps) {
  const isControlled = props.value !== undefined

  const [openMultiple, setOpenMultiple] = React.useState<string[]>(() =>
    props.type === 'multiple' ? (props.value ?? props.defaultValue ?? []) : [],
  )
  const [openSingle, setOpenSingle] = React.useState<string | null>(() =>
    props.type === 'single' ? ((props.value ?? props.defaultValue ?? null) as string | null) : null,
  )

  const openValues =
    props.type === 'multiple'
      ? isControlled
        ? (props.value ?? [])
        : openMultiple
      : (() => {
          const current = isControlled ? (props.value ?? null) : openSingle
          return current != null ? [current] : []
        })()

  const toggle = (value: string) => {
    if (props.type === 'multiple') {
      const current = isControlled ? (props.value ?? []) : openMultiple
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      if (!isControlled) setOpenMultiple(next)
      props.onValueChange?.(next)
    } else {
      const current = isControlled ? (props.value ?? null) : openSingle
      const next = current === value ? null : value
      if (!isControlled) setOpenSingle(next)
      props.onValueChange?.(next)
    }
  }

  return { openValues, toggle }
}

function PUIAccordionRow({
  item,
  open,
  disabled,
  baseId,
  onToggle,
}: {
  item: PUIAccordionItem
  open: boolean
  disabled: boolean
  baseId: string
  onToggle: () => void
}) {
  const triggerId = `${baseId}-${item.value}-trigger`
  const regionId = `${baseId}-${item.value}-content`
  const hintId = `${baseId}-${item.value}-hint`
  const LeadingIcon = item.leadingIcon

  return (
    <>
      <h3 className="m-0">
        <button
          aria-controls={regionId}
          aria-describedby={item.accessibilityHint ? hintId : undefined}
          aria-expanded={open}
          className={cn(
            'duration-fast flex min-h-11 w-full items-start gap-3 px-4 py-3 text-left transition-colors motion-reduce:transition-none',
            'hover:bg-muted focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          disabled={disabled}
          id={triggerId}
          onClick={onToggle}
          type="button"
        >
          {LeadingIcon ? (
            <LeadingIcon aria-hidden className="text-foreground mt-0.5 size-6 shrink-0" />
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-headline text-card-foreground font-semibold">{item.title}</span>
            {item.supportingText ? (
              <span className="text-footnote text-muted-foreground">{item.supportingText}</span>
            ) : null}
          </span>
          {item.trailingLabel ? (
            <span className="text-footnote text-muted-foreground mt-0.5 shrink-0">
              {item.trailingLabel}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden
            className={cn(
              'text-muted-foreground duration-normal mt-0.5 size-5 shrink-0 transition-transform motion-reduce:transition-none',
              open && 'rotate-180',
            )}
          />
        </button>
      </h3>
      {item.accessibilityHint ? (
        <span className="sr-only" id={hintId}>
          {item.accessibilityHint}
        </span>
      ) : null}
      <div
        aria-hidden={!open}
        aria-labelledby={triggerId}
        className={cn(
          'duration-normal ease-standard grid transition-[grid-template-rows] motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
        id={regionId}
        role="region"
      >
        <div className="overflow-hidden">
          <div className="text-callout text-muted-foreground px-4 pb-4" inert={!open}>
            {item.content}
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Collapsible content sections (single- or multiple-open), the web twin of native PUIAccordion.
 * Each item can carry a `leadingIcon`, a `supportingText` second line, a `trailingLabel` shown
 * before the chevron, and an `accessibilityHint` exposed to screen readers via `aria-describedby`.
 * Items can be individually disabled via `item.disabled`, on top of the accordion-level `disabled`.
 *
 * @scope both
 */
export function PUIAccordion(props: PUIAccordionProps) {
  const { items, className, disabled = false } = props
  const { openValues, toggle } = useAccordionState(props)
  const baseId = React.useId()

  return (
    <div className={cn('border-border bg-card overflow-hidden rounded-xl border', className)}>
      {items.map((item, index) => (
        <div className={cn(index > 0 && 'border-border border-t')} key={item.value}>
          <PUIAccordionRow
            baseId={baseId}
            disabled={disabled || (item.disabled ?? false)}
            item={item}
            open={openValues.includes(item.value)}
            onToggle={() => toggle(item.value)}
          />
        </div>
      ))}
    </div>
  )
}
