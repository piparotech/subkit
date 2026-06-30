import * as React from 'react'

import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'

import { cn } from '../../lib/utils'
import { PUIButton } from './PUIButton'
import { type PUIDatePickerMode, type PUIDatePickerOwnProps } from './PUIDatePicker.types'
import { PUIText } from './PUIText'

export { type PUIDatePickerMode, type PUIDatePickerOwnProps } from './PUIDatePicker.types'

export interface PUIDatePickerProps extends PUIDatePickerOwnProps {
  /** Id for the underlying control; auto-generated when omitted. */
  id?: string
  /** Forwarded to the trigger for PUIField error wiring (`role="alert"` message id). */
  'aria-describedby'?: string
}

const FORMAT: Record<PUIDatePickerMode, Intl.DateTimeFormatOptions> = {
  date: { dateStyle: 'medium' },
  time: { timeStyle: 'short' },
  datetime: { dateStyle: 'medium', timeStyle: 'short' },
}

function formatValue(value: Date, mode: PUIDatePickerMode): string {
  return new Intl.DateTimeFormat(undefined, FORMAT[mode]).format(value)
}

/** Full, locale-formatted date for a day cell's accessible name. */
function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date)
}

// Locale-stable, Monday-first weekday heads. Derived from a known Monday (2024-01-01) so the order
// never depends on the runtime's first-day-of-week.
const WEEKDAY_ANCHOR = new Date(2024, 0, 1)
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  WEEKDAY_FORMATTER.format(new Date(WEEKDAY_ANCHOR.getTime() + i * 86_400_000)),
)

const pad = (n: number) => String(n).padStart(2, '0')

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

/** Clamp a date into the optional [min, max] window so a commit can never escape the range. */
function clampDate(value: Date, min?: Date, max?: Date): Date {
  if (min && value.getTime() < min.getTime()) return new Date(min)
  if (max && value.getTime() > max.getTime()) return new Date(max)
  return value
}

/** Default year-grid bounds when the range is open: 1900 … current year + 10. */
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
 * trailing blanks to fill the final week.
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

function toTimeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * In-place year grid that replaces the day grid when the header is tapped — the fast year-jump.
 * Bounded by [minimumDate, maximumDate] (or 1900…currentYear+10 when open), 4 columns, the shown
 * year highlighted and auto-scrolled into view. Picking a year keeps the month and returns to the
 * grid.
 */
function YearGrid({
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
    selectedRef.current?.focus()
  }, [])

  return (
    <div className="grid max-h-66 grid-cols-4 gap-1 overflow-auto" role="menu">
      {years.map((year) => {
        const isShown = year === shownYear
        return (
          <button
            key={year}
            ref={isShown ? selectedRef : undefined}
            aria-current={isShown ? 'true' : undefined}
            className={cn(
              'text-callout flex min-h-11 items-center justify-center rounded-md',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              isShown
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-foreground hover:bg-muted',
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
 * Month-grid calendar with header year-jump. The header reads as a button (`aria-expanded`): tapping
 * it swaps the day grid for the {@link YearGrid}. Prev/next month chevrons disable at the [min, max]
 * edge; out-of-range days are disabled.
 */
function MonthCalendar({
  draft,
  minimumDate,
  maximumDate,
  onSelectDay,
}: {
  draft: Date
  minimumDate?: Date
  maximumDate?: Date
  onSelectDay: (date: Date) => void
}) {
  const today = new Date()
  const [shown, setShown] = React.useState({ year: draft.getFullYear(), month: draft.getMonth() })
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

  const prevDisabled = yearView || isMonthBeforeMin(shown.year, shown.month - 1, minimumDate)
  const nextDisabled = yearView || isMonthAfterMax(shown.year, shown.month + 1, maximumDate)

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <button
          aria-label="Previous month"
          className={cn(
            'text-muted-foreground flex h-11 w-11 items-center justify-center rounded-md',
            'hover:bg-muted focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            'disabled:pointer-events-none disabled:opacity-30',
          )}
          disabled={prevDisabled}
          onClick={() => shiftMonth(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <button
          aria-expanded={yearView}
          aria-label={`${monthTitle}, change year`}
          className={cn(
            'rounded-md px-2 py-1',
            'hover:bg-muted focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          )}
          onClick={() => setYearView((open) => !open)}
          type="button"
        >
          <PUIText className="font-semibold" variant="headline">
            {monthTitle}
          </PUIText>
        </button>
        <button
          aria-label="Next month"
          className={cn(
            'text-muted-foreground flex h-11 w-11 items-center justify-center rounded-md',
            'hover:bg-muted focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            'disabled:pointer-events-none disabled:opacity-30',
          )}
          disabled={nextDisabled}
          onClick={() => shiftMonth(1)}
          type="button"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>

      {yearView ? (
        <YearGrid
          maxYear={maxYear}
          minYear={minYear}
          onSelectYear={(year) => {
            setShown((current) => ({ year, month: current.month }))
            setYearView(false)
          }}
          shownYear={shown.year}
        />
      ) : (
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              {WEEKDAYS.map((label, index) => (
                <th key={index} className="pb-1" scope="col">
                  <PUIText tone="muted" variant="caption1">
                    {label}
                  </PUIText>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, weekIndex) => (
              <tr key={weekIndex}>
                {week.map((day, dayIndex) => {
                  if (day == null) {
                    return <td key={dayIndex} className="p-0.5" />
                  }
                  const cellDate = new Date(shown.year, shown.month, day)
                  const isSelected = isSameDay(cellDate, draft)
                  const isToday = isSameDay(cellDate, today)
                  const disabled = isOutOfRange(cellDate, minimumDate, maximumDate)
                  return (
                    <td key={dayIndex} className="p-0.5">
                      <button
                        aria-label={formatDayLabel(cellDate)}
                        aria-selected={isSelected}
                        className={cn(
                          'text-callout flex aspect-square w-full items-center justify-center rounded-md',
                          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                          'disabled:pointer-events-none disabled:opacity-30',
                          isSelected
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-foreground hover:bg-muted',
                          !isSelected && isToday && 'border-ring border',
                        )}
                        disabled={disabled}
                        onClick={() => onSelectDay(cellDate)}
                        type="button"
                      >
                        {day}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/**
 * Controlled web date/time field.
 *
 * `date` / `datetime` render a token-styled trigger button that opens a self-contained calendar
 * popover: a month grid with a fast YEAR-JUMP (tap the month/year header to swap in a year grid),
 * `minimumDate` / `maximumDate` disabling out-of-range days and capping the month chevrons, and for
 * `datetime` a trailing time input. Selection is held in a `draft` until Done commits it via
 * `onChange`; Cancel closes without committing. The popover closes on outside click or Escape and
 * restores focus to the trigger.
 *
 * `time` keeps the native `<input type="time">`, styled with the same token classes.
 *
 * `fullWidth` (default `true`) stretches the trigger; `false` hugs the value for a compact inline
 * field. Border precedence matches PUIInput: `error` > default (the field-opener has no sustained
 * "open" state).
 *
 * @scope both
 */
export const PUIDatePicker = React.forwardRef<
  HTMLButtonElement | HTMLInputElement,
  PUIDatePickerProps
>(function PUIDatePicker(
  {
    value,
    onChange,
    mode = 'date',
    minimumDate,
    maximumDate,
    disabled = false,
    error = false,
    accessibilityLabel,
    id,
    className,
    fullWidth = true,
    'aria-describedby': ariaDescribedby,
  },
  ref,
) {
  const generatedId = React.useId()
  const baseId = id ?? generatedId
  const formatted = formatValue(value, mode)

  // Native time field: no custom time idiom requested, so keep the platform control.
  if (mode === 'time') {
    return (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        aria-describedby={ariaDescribedby}
        aria-invalid={error || undefined}
        aria-label={accessibilityLabel}
        className={cn(
          'bg-background text-callout text-foreground flex min-h-11 items-center rounded-lg border px-3',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-destructive' : 'border-border focus-within:border-ring',
          fullWidth ? 'w-full' : 'w-auto',
          className,
        )}
        disabled={disabled}
        id={baseId}
        onChange={(event) => {
          const raw = event.target.value
          if (!raw) return
          const [h, m] = raw.split(':').map(Number)
          if (Number.isNaN(h) || Number.isNaN(m)) return
          const next = new Date(value)
          next.setHours(h, m, 0, 0)
          onChange?.(clampDate(next, minimumDate, maximumDate))
        }}
        type="time"
        value={toTimeInputValue(value)}
      />
    )
  }

  return (
    <CalendarField
      ariaDescribedby={ariaDescribedby}
      accessibilityLabel={accessibilityLabel}
      baseId={baseId}
      className={className}
      disabled={disabled}
      error={error}
      formatted={formatted}
      fullWidth={fullWidth}
      maximumDate={maximumDate}
      minimumDate={minimumDate}
      mode={mode}
      onChange={onChange}
      ref={ref as React.Ref<HTMLButtonElement>}
      value={value}
    />
  )
})
PUIDatePicker.displayName = 'PUIDatePicker'

interface CalendarFieldProps {
  ariaDescribedby?: string
  accessibilityLabel?: string
  baseId: string
  className?: string
  disabled: boolean
  error: boolean
  formatted: string
  fullWidth: boolean
  maximumDate?: Date
  minimumDate?: Date
  mode: PUIDatePickerMode
  onChange?: (date: Date) => void
  value: Date
}

const CalendarField = React.forwardRef<HTMLButtonElement, CalendarFieldProps>(
  function CalendarField(
    {
      ariaDescribedby,
      accessibilityLabel,
      baseId,
      className,
      disabled,
      error,
      formatted,
      fullWidth,
      maximumDate,
      minimumDate,
      mode,
      onChange,
      value,
    },
    forwardedRef,
  ) {
    const panelId = `${baseId}-panel`
    const summaryId = `${baseId}-summary`
    const [open, setOpen] = React.useState(false)
    const [draft, setDraft] = React.useState<Date>(value)

    const rootRef = React.useRef<HTMLDivElement>(null)
    const localTriggerRef = React.useRef<HTMLButtonElement>(null)
    const setTriggerRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        localTriggerRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      },
      [forwardedRef],
    )
    const panelRef = React.useRef<HTMLDivElement>(null)
    const wasOpen = React.useRef(false)

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

    // Move focus into the panel on open; restore it to the trigger on close.
    React.useEffect(() => {
      if (open) {
        wasOpen.current = true
        panelRef.current?.focus()
      } else if (wasOpen.current) {
        wasOpen.current = false
        localTriggerRef.current?.focus()
      }
    }, [open])

    const handleOpen = () => {
      setDraft(clampDate(value, minimumDate, maximumDate))
      setOpen(true)
    }

    const onTriggerKeyDown = (event: React.KeyboardEvent) => {
      if (open) return
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleOpen()
      }
    }

    const selectDay = (date: Date) =>
      setDraft((current) => {
        const next = new Date(current)
        next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
        return next
      })

    const selectTime = (hours: number, minutes: number) =>
      setDraft((current) => {
        const next = new Date(current)
        next.setHours(hours, minutes, 0, 0)
        return clampDate(next, minimumDate, maximumDate)
      })

    const commit = () => {
      onChange?.(clampDate(draft, minimumDate, maximumDate))
      close()
    }

    return (
      <div ref={rootRef} className={cn('relative', fullWidth ? 'block' : 'inline-block')}>
        <button
          ref={setTriggerRef}
          aria-controls={open ? panelId : undefined}
          aria-describedby={ariaDescribedby}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-invalid={error || undefined}
          aria-label={accessibilityLabel}
          className={cn(
            'bg-background text-callout text-foreground flex min-h-11 items-center gap-2 rounded-lg border px-3',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-destructive' : 'border-border',
            fullWidth ? 'w-full justify-between' : 'w-auto justify-start',
            className,
          )}
          disabled={disabled}
          id={baseId}
          onClick={() => (open ? close() : handleOpen())}
          onKeyDown={onTriggerKeyDown}
          type="button"
        >
          <span className={cn('truncate', !fullWidth && 'text-left')}>{formatted}</span>
          <Calendar aria-hidden className="text-muted-foreground size-4 shrink-0" />
        </button>

        {open ? (
          <div
            ref={panelRef}
            aria-label={accessibilityLabel}
            className={cn(
              'z-overlay border-border bg-card text-card-foreground absolute top-full left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border p-3 shadow-md outline-none',
            )}
            id={panelId}
            role="dialog"
            tabIndex={-1}
          >
            <PUIText className="mb-2 block font-semibold" id={summaryId} variant="headline">
              {formatValue(draft, mode)}
            </PUIText>

            <MonthCalendar
              draft={draft}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              onSelectDay={selectDay}
            />

            {mode === 'datetime' ? (
              <div className="mt-3 flex items-center gap-2">
                <Clock aria-hidden className="text-muted-foreground size-4 shrink-0" />
                <input
                  aria-label="Time"
                  className={cn(
                    'border-border bg-background text-callout text-foreground flex min-h-11 flex-1 items-center rounded-md border px-3',
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  )}
                  onChange={(event) => {
                    const raw = event.target.value
                    if (!raw) return
                    const [h, m] = raw.split(':').map(Number)
                    if (Number.isNaN(h) || Number.isNaN(m)) return
                    selectTime(h, m)
                  }}
                  type="time"
                  value={toTimeInputValue(draft)}
                />
              </div>
            ) : null}

            <div className="mt-3 flex justify-end gap-2">
              <PUIButton size="sm" variant="secondary" onPress={close}>
                Cancel
              </PUIButton>
              <PUIButton size="sm" variant="default" onPress={commit}>
                Done
              </PUIButton>
            </div>
          </div>
        ) : null}
      </div>
    )
  },
)
