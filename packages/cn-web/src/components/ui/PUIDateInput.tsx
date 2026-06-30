import * as React from 'react'

import { Calendar } from 'lucide-react'

import { cn } from '../../lib/utils'
import { type PUIDateInputOwnProps } from './PUIDateInput.types'
import { PUIText } from './PUIText'

export { type PUIDateInputOwnProps } from './PUIDateInput.types'

export interface PUIDateInputProps extends PUIDateInputOwnProps {
  /** Id for the underlying `<input>`; auto-generated when omitted. */
  id?: string
}

type Unit = 'day' | 'month' | 'year'

/** Length of each date unit in digits, fixed across locales (zero-padded day/month, 4-digit year). */
const UNIT_LENGTH: Record<Unit, number> = { day: 2, month: 2, year: 4 }

/** A per-unit string map keyed by language tag prefix, with a guaranteed `default` fallback. */
interface UnitStringMap {
  default: Record<Unit, string>
  [lang: string]: Record<Unit, string> | undefined
}

/** Per-unit placeholder glyph, by locale language tag prefix. de → T/M/J, otherwise D/M/Y. */
const PLACEHOLDER_GLYPH: UnitStringMap = {
  de: { day: 'T', month: 'M', year: 'J' },
  default: { day: 'D', month: 'M', year: 'Y' },
}

/** Spoken name per unit for the a11y format hint, by language prefix. */
const UNIT_LABEL: UnitStringMap = {
  de: { day: 'Tag', month: 'Monat', year: 'Jahr' },
  default: { day: 'day', month: 'month', year: 'year' },
}

/** Concise spoken reason on an internally-detected invalid entry, by language prefix. */
const INVALID_HINT: Record<string, string | undefined> & { default: string } = {
  de: 'Ungültiges Datum',
  default: 'Invalid date',
}

const TOTAL_DIGITS = UNIT_LENGTH.day + UNIT_LENGTH.month + UNIT_LENGTH.year

interface LocaleMask {
  /** Date units in the locale's display order (e.g. ['day','month','year'] for de). */
  order: Unit[]
  /** The literal separator between units (e.g. '.' for de, '/' for en-US). */
  separator: string
  /** Placeholder pattern string (e.g. 'TT.MM.JJJJ'). */
  placeholder: string
  /** Spoken format hint (e.g. 'Format Tag Monat Jahr'). */
  hint: string
  /** Concise spoken reason announced when an entry is invalid (e.g. 'Ungültiges Datum'). */
  invalidHint: string
  /** Full mask length including separators — drives maxLength. */
  maskLength: number
}

/**
 * Derive the day/month/year order + separator from the platform locale via
 * `Intl.DateTimeFormat(...).formatToParts` — never hardcoded. Falls back to ISO-ish D/M/Y on the
 * '.' separator if the runtime gives no usable parts.
 */
function deriveMask(): LocaleMask {
  const lang = (
    new Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0] ?? 'default'
  ).toLowerCase()
  const glyphs = PLACEHOLDER_GLYPH[lang] ?? PLACEHOLDER_GLYPH.default
  const labels = UNIT_LABEL[lang] ?? UNIT_LABEL.default

  const parts = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date(2026, 11, 31))

  const order: Unit[] = []
  let separator = ''
  for (const part of parts) {
    if (part.type === 'day') order.push('day')
    else if (part.type === 'month') order.push('month')
    else if (part.type === 'year') order.push('year')
    else if (part.type === 'literal' && separator === '') separator = part.value.trim() || '.'
  }
  if (order.length !== 3) order.splice(0, order.length, 'day', 'month', 'year')
  if (separator === '') separator = '.'

  const placeholder = order
    .map((unit) => (glyphs[unit] ?? '?').repeat(UNIT_LENGTH[unit]))
    .join(separator)
  const hint = `Format ${order.map((unit) => labels[unit] ?? unit).join(' ')}`
  const invalidHint = INVALID_HINT[lang] ?? INVALID_HINT.default
  const maskLength = TOTAL_DIGITS + separator.length * (order.length - 1)

  return { order, separator, placeholder, hint, invalidHint, maskLength }
}

/** Strip everything but digits and cap at the total date digit budget. */
function digitsOf(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, TOTAL_DIGITS)
}

/** Insert the separator into a digit string following the locale unit order (the input mask). */
function maskDigits(digits: string, mask: LocaleMask): string {
  const segments: string[] = []
  let cursor = 0
  for (const unit of mask.order) {
    if (cursor >= digits.length) break
    segments.push(digits.slice(cursor, cursor + UNIT_LENGTH[unit]))
    cursor += UNIT_LENGTH[unit]
  }
  return segments.join(mask.separator)
}

/** Split a complete 8-digit string into its day/month/year numbers per the locale order. */
function unitsOf(digits: string, mask: LocaleMask): Record<Unit, number> {
  const out: Record<Unit, number> = { day: 0, month: 0, year: 0 }
  let cursor = 0
  for (const unit of mask.order) {
    out[unit] = Number(digits.slice(cursor, cursor + UNIT_LENGTH[unit]))
    cursor += UNIT_LENGTH[unit]
  }
  return out
}

/**
 * Build + round-trip validate a Date from the typed units: the constructed date's d/m/y must equal
 * the typed values (this rejects 31.02, month 13, etc.), then it must fall inside [min, max].
 * Returns the valid Date or `null`.
 */
function parseDate(
  digits: string,
  mask: LocaleMask,
  minimumDate?: Date,
  maximumDate?: Date,
): Date | null {
  if (digits.length !== TOTAL_DIGITS) return null
  const { day, month, year } = unitsOf(digits, mask)
  if (day < 1 || month < 1 || year < 1) return null

  const candidate = new Date(year, month - 1, day)
  // `new Date(year, …)` remaps a 0–99 year to 1900–1999; setFullYear does NOT, so a typed 4-digit
  // year like 0050 stays 50. Apply it before the round-trip check so impossible dates (31.02) still
  // reject while small years are honoured.
  candidate.setFullYear(year)
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null
  }
  if (minimumDate && candidate.getTime() < startOfDay(minimumDate).getTime()) return null
  if (maximumDate && candidate.getTime() > endOfDay(maximumDate).getTime()) return null
  return candidate
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

/** Render a Date as the masked digit string for the controlled value. */
function formatValue(date: Date, mask: LocaleMask): string {
  const pad: Record<Unit, string> = {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()).padStart(4, '0'),
  }
  return mask.order.map((unit) => pad[unit]).join(mask.separator)
}

function sameDate(a: Date | null, b: Date | null): boolean {
  return a === null || b === null ? a === b : a.getTime() === b.getTime()
}

/**
 * Typed keyboard date field — the user TYPES the date (e.g. 01.06.2026) on the numeric keyboard
 * instead of spinning a wheel or opening the native picker. Sits alongside PUIDatePicker with the
 * same trigger chrome (`min-h-11 rounded-lg border bg-background px-3`, trailing lucide Calendar,
 * error → destructive border, disabled → dim, fullWidth). The day/month/year ORDER, the separator,
 * the placeholder pattern and the format hint are all derived from the platform locale via
 * `Intl.DateTimeFormat.formatToParts` — never hardcoded. Input is a controlled, masked
 * `inputMode="numeric"` field: digits flow into the locale slots, the separator auto-inserts,
 * backspace removes the last digit. On a complete entry (or on blur) the value is round-trip
 * validated (so 31.02 is rejected) and clamped to `[minimumDate, maximumDate]`; valid →
 * `onChange(date)`, incomplete/invalid/out-of-range → internal error + `onChange(null)`, cleared →
 * `onChange(null)` with no error.
 *
 * @scope both
 */
export const PUIDateInput = React.forwardRef<HTMLInputElement, PUIDateInputProps>(
  function PUIDateInput(
    {
      value,
      onChange,
      minimumDate,
      maximumDate,
      disabled = false,
      error = false,
      errorMessage,
      fullWidth = true,
      accessibilityLabel,
      id,
      className,
    },
    ref,
  ) {
    const mask = React.useMemo(() => deriveMask(), [])
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`
    const hintId = `${inputId}-hint`

    const [internalError, setInternalError] = React.useState(false)
    const [draftDigits, setDraftDigits] = React.useState<string | null>(null)

    // The last value WE emitted, so we can (a) distinguish an external `value` change from our own
    // round-trip and (b) de-dupe redundant onChange calls. `undefined` = nothing emitted yet.
    const lastEmittedRef = React.useRef<Date | null | undefined>(undefined)

    const emit = (next: Date | null) => {
      if (lastEmittedRef.current !== undefined && sameDate(lastEmittedRef.current, next)) return
      lastEmittedRef.current = next
      onChange?.(next)
    }

    // Resync to an EXTERNAL `value` change (parent reset / late prefill / "today" button) without
    // clobbering in-progress typing: our own emission round-trips back as the same value and is a
    // no-op, but any value we did not emit drops the draft so the controlled prop wins again.
    React.useEffect(() => {
      if (lastEmittedRef.current !== undefined && sameDate(lastEmittedRef.current, value)) return
      lastEmittedRef.current = value
      setDraftDigits(null)
      setInternalError(false)
    }, [value])

    const digits = draftDigits ?? (value ? formatValue(value, mask).replace(/\D/g, '') : '')
    const display = maskDigits(digits, mask)
    const showError = error || internalError
    const showInlineError = errorMessage != null && showError

    const commit = (nextDigits: string) => {
      if (nextDigits.length === 0) {
        setInternalError(false)
        emit(null)
        return
      }
      if (nextDigits.length < TOTAL_DIGITS) {
        emit(null)
        return
      }
      const parsed = parseDate(nextDigits, mask, minimumDate, maximumDate)
      setInternalError(parsed === null)
      emit(parsed)
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = digitsOf(event.target.value)
      setDraftDigits(next)
      if (internalError) setInternalError(false)
      commit(next)
    }

    const handleBlur = () => {
      if (digits.length > 0 && digits.length < TOTAL_DIGITS) {
        setInternalError(true)
        emit(null)
      }
    }

    // The field identity stays the accessible name; the format hint is the field's description (read
    // after the name). On an internally-detected invalid entry with no inline message, fold a
    // concise reason into the hint so the destructive border is never silent for a screen reader.
    const hintText =
      internalError && !showInlineError ? `${mask.invalidHint}. ${mask.hint}` : mask.hint
    const describedBy = showInlineError ? `${errorId} ${hintId}` : hintId

    return (
      <div className={cn('flex flex-col gap-2', fullWidth ? 'w-full' : 'w-fit')}>
        <div
          className={cn(
            'bg-background flex min-h-11 items-center gap-2 rounded-lg border px-3',
            fullWidth ? 'w-full' : 'w-fit',
            showError ? 'border-destructive' : 'border-border focus-within:border-ring',
            disabled && 'opacity-50',
            'focus-within:ring-ring focus-within:ring-2',
            className,
          )}
        >
          <input
            ref={ref}
            aria-describedby={describedBy}
            aria-invalid={showError || undefined}
            aria-label={accessibilityLabel}
            className={cn(
              'text-callout text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent py-2.5',
              'focus-visible:outline-none disabled:cursor-not-allowed',
            )}
            disabled={disabled}
            id={inputId}
            inputMode="numeric"
            maxLength={mask.maskLength}
            onBlur={handleBlur}
            onChange={handleChange}
            placeholder={mask.placeholder}
            value={display}
          />
          <Calendar aria-hidden className="text-muted-foreground" size={18} />
        </div>
        <span className="sr-only" id={hintId}>
          {hintText}
        </span>
        {showInlineError ? (
          <p id={errorId} role="alert">
            <PUIText className="text-destructive" variant="footnote">
              {errorMessage}
            </PUIText>
          </p>
        ) : null}
      </div>
    )
  },
)
PUIDateInput.displayName = 'PUIDateInput'
