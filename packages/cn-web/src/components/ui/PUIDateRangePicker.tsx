import * as React from 'react'

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '../../lib/utils'
import { type PUIDateRange, type PUIDateRangePickerProps } from './PUIDateRangePicker.types'
import { PUIText } from './PUIText'

export type { PUIDateRange, PUIDateRangePickerProps } from './PUIDateRangePicker.types'

// Locale-stable, Monday-first weekday heads. Derived from a known Monday (2024-01-01)
// so the order never depends on the runtime's first-day-of-week.
const WEEKDAY_ANCHOR = new Date(2024, 0, 1)
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  WEEKDAY_FORMATTER.format(new Date(WEEKDAY_ANCHOR.getTime() + i * 86_400_000)),
)

const RANGE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
const RANGE_FORMAT_WITH_YEAR: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}

/** Full, locale-formatted date for a day cell's accessible name. */
function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date)
}

/**
 * Trigger summary of a range. `start && end` collapses to "1. Jun – 5. Jun 2026" (the year shown
 * once unless the bounds straddle two years), or a single formatted date when both bounds fall on
 * the same day (one date, no dash); `start` alone reads "1. Jun – …"; an empty range returns `null`
 * so the caller can fall back to the placeholder.
 */
function formatRange(range: PUIDateRange): string | null {
  const { start, end } = range
  if (start && end) {
    if (isSameDay(start, end)) {
      return new Intl.DateTimeFormat(undefined, RANGE_FORMAT_WITH_YEAR).format(start)
    }
    const sameYear = start.getFullYear() === end.getFullYear()
    const startText = new Intl.DateTimeFormat(
      undefined,
      sameYear ? RANGE_FORMAT : RANGE_FORMAT_WITH_YEAR,
    ).format(start)
    const endText = new Intl.DateTimeFormat(undefined, RANGE_FORMAT_WITH_YEAR).format(end)
    return `${startText} – ${endText}`
  }
  if (start) {
    return `${new Intl.DateTimeFormat(undefined, RANGE_FORMAT_WITH_YEAR).format(start)} – …`
  }
  return null
}

/** 0=Mon … 6=Sun for a given date (JS getDay is 0=Sun). */
function mondayFirstIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Day-granular floor of a date (00:00:00.000), for comparing a calendar cell against a bound. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** True when `cellDate` falls outside the optional [min, max] window (day granularity). */
function isOutOfRange(cellDate: Date, min?: Date, max?: Date): boolean {
  const day = startOfDay(cellDate).getTime()
  if (min && day < startOfDay(min).getTime()) return true
  if (max && day > startOfDay(max).getTime()) return true
  return false
}

/**
 * Day-floor a date, then clamp it into the optional [min, max] window so a commit can never escape
 * the range. Flooring keeps both committed bounds at day granularity (no time-bearing start mixed
 * with a day-floored end).
 */
function clampDate(value: Date, min?: Date, max?: Date): Date {
  const day = startOfDay(value)
  if (min && day.getTime() < startOfDay(min).getTime()) return startOfDay(min)
  if (max && day.getTime() > startOfDay(max).getTime()) return startOfDay(max)
  return day
}

/** Day-floor and clamp both bounds of a range into [min, max] before seeding or committing. */
function clampRange(range: PUIDateRange, min?: Date, max?: Date): PUIDateRange {
  return {
    start: range.start ? clampDate(range.start, min, max) : null,
    end: range.end ? clampDate(range.end, min, max) : null,
  }
}

/** Default year-picker bounds when the range is open: 1900 … current year + 10. */
const DEFAULT_MIN_YEAR = 1900
const DEFAULT_MAX_YEAR_OFFSET = 10

/** First day of the month is the floor for "can we step back?"; same idea forward. */
function isMonthBeforeMin(year: number, month: number, min?: Date): boolean {
  if (!min) return false
  return new Date(year, month + 1, 0).getTime() < startOfDay(min).getTime()
}
function isMonthAfterMax(year: number, month: number, max?: Date): boolean {
  if (!max) return false
  return new Date(year, month, 1).getTime() > startOfDay(max).getTime()
}

/**
 * The month grid as weeks of 7 cells, leading `null` blanks for the first-weekday offset and
 * trailing blanks to fill the final week. Rows of `flex-1` cells divide evenly (no percentage-basis
 * sub-pixel wrap).
 */
function buildMonthWeeks(year: number, month: number): (number | null)[][] {
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = mondayFirstIndex(firstOfMonth)
  const cells: (number | null)[] = Array.from({ length: leading }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Where a calendar cell sits relative to the draft range — drives the highlight band. */
type CellPosition = 'none' | 'start' | 'end' | 'single' | 'between'

/** Classify a cell against the draft range for range-band rendering. */
function cellPosition(cellDate: Date, range: PUIDateRange): CellPosition {
  const { start, end } = range
  if (!start) return 'none'
  if (!end) return isSameDay(cellDate, start) ? 'single' : 'none'
  const isStart = isSameDay(cellDate, start)
  const isEnd = isSameDay(cellDate, end)
  if (isStart && isEnd) return 'single'
  if (isStart) return 'start'
  if (isEnd) return 'end'
  const day = startOfDay(cellDate).getTime()
  if (day > startOfDay(start).getTime() && day < startOfDay(end).getTime()) return 'between'
  return 'none'
}

const POSITION_A11Y: Record<Exclude<CellPosition, 'none'>, string> = {
  start: 'Start date',
  end: 'End date',
  single: 'Start date',
  between: 'in range',
}

/**
 * In-place year grid that replaces the day grid when the header is activated. Bounded by
 * [minimumDate, maximumDate] (or 1900…currentYear+10 when open), 4 columns, the shown year
 * highlighted and auto-scrolled into view. Picking a year keeps the month and returns to the grid.
 */
function YearPicker({
  shownYear,
  minYear,
  maxYear,
  onSelectYear,
}: {
  shownYear: number
  minYear: number
  maxYear: number
  onSelectYear: (year: number) => void
}) {
  const years = React.useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i),
    [minYear, maxYear],
  )
  const selectedRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div
      className="grid max-h-66 grid-cols-4 gap-1 overflow-y-auto"
      role="menu"
      aria-label="Select year"
    >
      {years.map((year) => {
        const isShown = year === shownYear
        return (
          <button
            key={year}
            ref={isShown ? selectedRef : undefined}
            aria-current={isShown ? 'true' : undefined}
            className={cn(
              'text-callout text-foreground flex min-h-11 items-center justify-center rounded-md',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              isShown && 'bg-primary text-primary-foreground font-medium',
              !isShown && 'hover:bg-accent hover:text-accent-foreground',
            )}
            onClick={() => onSelectYear(year)}
            role="menuitem"
            type="button"
          >
            {year}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Range-aware month grid. Start and end cells are filled `bg-primary` with round caps; the
 * strictly-between days draw a connected `bg-accent` band (square inner edges) so the selection
 * reads as one bar. A standalone start (awaiting end) is a single filled cell. Out-of-[min,max]
 * days are dimmed and non-tappable. Navigates by month or via the year-jump header.
 */
function RangeMonthCalendar({
  range,
  minimumDate,
  maximumDate,
  onSelectDay,
}: {
  range: PUIDateRange
  minimumDate?: Date
  maximumDate?: Date
  onSelectDay: (date: Date) => void
}) {
  const today = new Date()
  const anchor = range.start ?? today
  const [shown, setShown] = React.useState({
    year: anchor.getFullYear(),
    month: anchor.getMonth(),
  })
  const [yearView, setYearView] = React.useState(false)

  const shiftMonth = (delta: number) =>
    setShown((current) => {
      const next = new Date(current.year, current.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })

  const minYear = minimumDate ? minimumDate.getFullYear() : DEFAULT_MIN_YEAR
  const maxYear = maximumDate
    ? maximumDate.getFullYear()
    : new Date().getFullYear() + DEFAULT_MAX_YEAR_OFFSET

  const monthTitle = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(shown.year, shown.month, 1))
  const weeks = buildMonthWeeks(shown.year, shown.month)

  const prevDisabled = isMonthBeforeMin(shown.year, shown.month - 1, minimumDate)
  const nextDisabled = isMonthAfterMax(shown.year, shown.month + 1, maximumDate)

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <button
          aria-label="Previous month"
          className={cn(
            'text-muted-foreground flex size-11 items-center justify-center rounded-md',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            'disabled:pointer-events-none disabled:opacity-30',
          )}
          disabled={prevDisabled || yearView}
          onClick={() => shiftMonth(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <button
          aria-expanded={yearView}
          aria-label={`${monthTitle}, change year`}
          className={cn(
            'text-headline text-foreground flex min-h-11 items-center rounded-md px-2 font-semibold',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          )}
          onClick={() => setYearView((open) => !open)}
          type="button"
        >
          {monthTitle}
        </button>
        <button
          aria-label="Next month"
          className={cn(
            'text-muted-foreground flex size-11 items-center justify-center rounded-md',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            'disabled:pointer-events-none disabled:opacity-30',
          )}
          disabled={nextDisabled || yearView}
          onClick={() => shiftMonth(1)}
          type="button"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>

      {yearView ? (
        <YearPicker
          maxYear={maxYear}
          minYear={minYear}
          onSelectYear={(year) => {
            setShown((current) => ({ year, month: current.month }))
            setYearView(false)
          }}
          shownYear={shown.year}
        />
      ) : (
        <div role="grid" aria-label={monthTitle}>
          <div className="mb-1 flex" role="row">
            {WEEKDAYS.map((label, index) => (
              <div
                key={index}
                aria-label={label}
                className="flex flex-1 items-center justify-center py-1"
                role="columnheader"
              >
                <PUIText tone="muted" variant="caption1">
                  {label}
                </PUIText>
              </div>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex" role="row">
              {week.map((day, dayIndex) => {
                if (day == null) {
                  return (
                    <div key={dayIndex} className="aspect-square flex-1 p-0.5" role="gridcell" />
                  )
                }
                const cellDate = new Date(shown.year, shown.month, day)
                const position = cellPosition(cellDate, range)
                const isToday = isSameDay(cellDate, today)
                const disabled = isOutOfRange(cellDate, minimumDate, maximumDate)
                const isCap = position === 'start' || position === 'end' || position === 'single'
                const isBetween = position === 'between'
                // Caps round; the between-band squares its inner edge toward each cap so the
                // accent reads as one connected bar across the week row.
                const bandCorner =
                  position === 'start' ? 'rounded-l-md' : position === 'end' ? 'rounded-r-md' : ''
                const a11ySuffix = position === 'none' ? '' : `, ${POSITION_A11Y[position]}`
                return (
                  <div key={dayIndex} className="aspect-square flex-1 py-0.5" role="gridcell">
                    <div
                      className={cn(
                        'flex h-full items-stretch',
                        isBetween && 'bg-accent',
                        isCap && position !== 'single' && 'bg-accent',
                        isCap && bandCorner,
                      )}
                    >
                      <button
                        aria-label={`${formatDayLabel(cellDate)}${a11ySuffix}`}
                        aria-pressed={isCap}
                        className={cn(
                          'text-callout text-foreground flex min-h-10 flex-1 items-center justify-center rounded-md',
                          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                          !disabled &&
                            position === 'none' &&
                            'hover:bg-accent hover:text-accent-foreground',
                          isCap && 'bg-primary text-primary-foreground font-medium',
                          isBetween && 'text-accent-foreground rounded-none',
                          position === 'none' && isToday && 'border-ring border',
                          disabled && 'pointer-events-none opacity-30',
                        )}
                        disabled={disabled}
                        onClick={() => onSelectDay(cellDate)}
                        type="button"
                      >
                        {day}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Cross-platform date-RANGE picker (web twin of the cn-native control). The trigger is a
 * field-opener showing the formatted "from – to" range (or a muted placeholder when empty) plus a
 * trailing Calendar icon, so it reads as interactive like Select/Combobox; on click (or
 * ArrowDown / Enter / Space) it opens an anchored popover with a month-grid calendar. Clicking a
 * day sets the START, the next click sets the END (a day before the start restarts the range
 * there); the start/end cells fill `bg-primary` and the days between draw a connected `bg-accent`
 * band. A single-day range renders one date (no dash). Out-of-[min,max] days are disabled and can
 * never enter the range. The header is a button that jumps years, and Done commits the draft range
 * while Cancel discards it; a Clear affordance empties the draft.
 *
 * Selection lives in a `draft` range; the trigger keeps showing `value` until Done commits it via
 * `onChange`. Border precedence matches PUIInput (error > default). Closes on outside click or
 * Escape; focus moves into the panel on open and returns to the trigger on close (focus
 * trap/restore parity with the native useModalFocus twin).
 *
 * @scope both
 */
export const PUIDateRangePicker = React.forwardRef<HTMLButtonElement, PUIDateRangePickerProps>(
  function PUIDateRangePicker(
    {
      value,
      onChange,
      minimumDate,
      maximumDate,
      disabled = false,
      error = false,
      fullWidth = true,
      accessibilityLabel,
      id,
      className,
      'aria-describedby': ariaDescribedby,
    },
    forwardedRef,
  ) {
    const generatedId = React.useId()
    const baseId = id ?? generatedId
    const valueId = `${baseId}-value`
    const panelId = `${baseId}-panel`
    const summaryId = `${panelId}-summary`

    const [open, setOpen] = React.useState(false)
    const [draft, setDraft] = React.useState<PUIDateRange>(value)
    // Remount the calendar on each open so it re-seeds its month/yearView from the current draft.
    const [openNonce, setOpenNonce] = React.useState(0)

    const rootRef = React.useRef<HTMLDivElement>(null)
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const panelRef = React.useRef<HTMLDivElement>(null)
    const wasOpen = React.useRef(false)

    React.useImperativeHandle(forwardedRef, () => triggerRef.current as HTMLButtonElement, [])

    const close = React.useCallback(() => setOpen(false), [])

    React.useEffect(() => {
      if (!open) return
      const onPointerDown = (event: PointerEvent) => {
        if (!rootRef.current?.contains(event.target as Node)) close()
      }
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          close()
        }
      }
      document.addEventListener('pointerdown', onPointerDown)
      document.addEventListener('keydown', onKeyDown)
      return () => {
        document.removeEventListener('pointerdown', onPointerDown)
        document.removeEventListener('keydown', onKeyDown)
      }
    }, [open, close])

    // Move focus into the panel on open; restore it to the trigger on close (focus trap/restore
    // parity with the native useModalFocus twin), regardless of how the close happened.
    React.useEffect(() => {
      if (open) {
        wasOpen.current = true
        panelRef.current?.focus()
      } else if (wasOpen.current) {
        wasOpen.current = false
        triggerRef.current?.focus()
      }
    }, [open])

    const formatted = formatRange(value)
    const draftFormatted = formatRange(draft)
    const placeholder = 'Select date range'

    const handleOpen = () => {
      if (disabled) return
      setDraft(clampRange(value, minimumDate, maximumDate))
      setOpenNonce((nonce) => nonce + 1)
      setOpen(true)
    }

    // No start yet, or both bounds set → start a fresh range. Start set, no end → a day >= start
    // closes the range; an earlier day restarts the range at that day.
    const selectDay = (date: Date) =>
      setDraft((current) => {
        const day = startOfDay(date)
        if (!current.start || current.end) return { start: day, end: null }
        if (day.getTime() < startOfDay(current.start).getTime()) return { start: day, end: null }
        return { start: current.start, end: day }
      })

    const clear = () => setDraft({ start: null, end: null })

    const commit = () => {
      onChange?.(clampRange(draft, minimumDate, maximumDate))
      close()
    }

    const onTriggerKeyDown = (event: React.KeyboardEvent) => {
      if (open) return
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleOpen()
      }
    }

    return (
      <div ref={rootRef} className={cn('relative', fullWidth ? 'block' : 'inline-block')}>
        <button
          ref={triggerRef}
          aria-describedby={[ariaDescribedby, valueId].filter(Boolean).join(' ') || undefined}
          aria-controls={open ? panelId : undefined}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-invalid={error || undefined}
          aria-label={accessibilityLabel}
          className={cn(
            'bg-background text-callout flex min-h-11 items-center rounded-lg border px-3',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            fullWidth ? 'w-full justify-between' : 'gap-2',
            error ? 'border-destructive' : 'border-border',
            className,
          )}
          disabled={disabled}
          id={baseId}
          onClick={handleOpen}
          onKeyDown={onTriggerKeyDown}
          type="button"
        >
          <PUIText className="truncate" tone={formatted ? 'default' : 'muted'} variant="callout">
            {formatted ?? placeholder}
          </PUIText>
          <Calendar aria-hidden className="text-muted-foreground size-4.5 shrink-0" />
        </button>
        <span className="sr-only" id={valueId}>
          {formatted ?? placeholder}
        </span>

        {open ? (
          <div
            ref={panelRef}
            aria-describedby={summaryId}
            aria-label={accessibilityLabel}
            className="z-overlay border-border bg-card text-card-foreground absolute top-full left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border p-3 shadow-md outline-none"
            id={panelId}
            role="dialog"
            tabIndex={-1}
          >
            <PUIText
              as="p"
              className="mb-2 block px-1"
              id={summaryId}
              tone="muted"
              variant="footnote"
            >
              {draftFormatted ?? placeholder}
            </PUIText>

            <RangeMonthCalendar
              key={openNonce}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              onSelectDay={selectDay}
              range={draft}
            />

            <div className="border-border mt-3 flex items-center justify-end gap-2 border-t pt-3">
              <button
                className={cn(
                  'text-callout text-muted-foreground mr-auto flex min-h-11 items-center rounded-md px-3',
                  'hover:text-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
                disabled={!draft.start && !draft.end}
                onClick={clear}
                type="button"
              >
                Clear
              </button>
              <button
                className="border-border bg-background text-callout text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex min-h-11 items-center rounded-md border px-4 focus-visible:ring-2 focus-visible:outline-none"
                onClick={close}
                type="button"
              >
                Cancel
              </button>
              <button
                className="bg-primary text-callout text-primary-foreground focus-visible:ring-ring flex min-h-11 items-center rounded-md px-4 font-medium hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
                onClick={commit}
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>
    )
  },
)
