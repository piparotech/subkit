import * as React from 'react'

import { cn } from '../../lib/utils'
import { type PUIPinInputProps } from './PUIPinInput.types'

export type { PUIPinInputProps } from './PUIPinInput.types'

const MIN_LENGTH = 4
const MAX_LENGTH = 8
const DEFAULT_LENGTH = 6
const BULLET = '•'

const clampLength = (length: number): number =>
  Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Math.trunc(length)))

const sanitize = (raw: string, max: number): string => raw.replace(/\D/g, '').slice(0, max)

/**
 * Secure N-cell code entry (PIN / OTP). The code is a SINGLE controlled digit string; each visible
 * cell is one numeric `<input>` reading off that string. Typing a digit advances focus, Backspace
 * on an empty cell steps back, and a paste on any cell spreads its digits across the remaining
 * cells. `mask` swaps each filled digit for a bullet glyph in the display while the real code
 * stays in `value`. `error` styles the WHOLE field (every cell border + `aria-invalid`), never a
 * single cell; the error MESSAGE is owned by the wrapping PUIField. Each cell carries
 * `inputMode="numeric"` and `autoComplete="one-time-code"` so SMS autofill lands across the row;
 * the focused cell takes the soft focus ring.
 *
 * @scope both
 */
export const PUIPinInput = React.forwardRef<HTMLInputElement, PUIPinInputProps>(
  function PUIPinInput(
    {
      value,
      onChange,
      length = DEFAULT_LENGTH,
      mask = false,
      disabled = false,
      error = false,
      autoFocus = false,
      onComplete,
      className,
    },
    ref,
  ) {
    const slots = clampLength(length)
    const cellRefs = React.useRef<Array<HTMLInputElement | null>>([])

    const code = sanitize(value, slots)

    const emit = (next: string): void => {
      const sanitized = sanitize(next, slots)
      onChange?.(sanitized)
      if (sanitized.length === slots) onComplete?.(sanitized)
    }

    const focusCell = (index: number): void => {
      const target = cellRefs.current[Math.max(0, Math.min(index, slots - 1))]
      target?.focus()
      target?.select()
    }

    const replaceAt = (index: number, digit: string): string => {
      const chars = code.padEnd(slots, ' ').split('')
      chars[index] = digit
      return chars.join('').replace(/ /g, '')
    }

    const handleChange =
      (index: number) =>
      (event: React.ChangeEvent<HTMLInputElement>): void => {
        const digits = sanitize(event.target.value, slots)
        if (digits.length === 0) {
          emit(replaceAt(index, ''))
          return
        }
        if (digits.length === 1) {
          emit(replaceAt(index, digits))
          focusCell(index + 1)
          return
        }
        const merged = sanitize(code.slice(0, index) + digits, slots)
        emit(merged)
        focusCell(merged.length)
      }

    const handleKeyDown =
      (index: number) =>
      (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'Backspace') {
          if (code[index]) {
            emit(replaceAt(index, ''))
          } else if (index > 0) {
            event.preventDefault()
            emit(replaceAt(index - 1, ''))
            focusCell(index - 1)
          }
          return
        }
        if (event.key === 'ArrowLeft' && index > 0) {
          event.preventDefault()
          focusCell(index - 1)
        }
        if (event.key === 'ArrowRight' && index < slots - 1) {
          event.preventDefault()
          focusCell(index + 1)
        }
      }

    const handlePaste =
      (index: number) =>
      (event: React.ClipboardEvent<HTMLInputElement>): void => {
        event.preventDefault()
        const pasted = sanitize(event.clipboardData.getData('text'), slots)
        if (pasted.length === 0) return
        const merged = sanitize(code.slice(0, index) + pasted, slots)
        emit(merged)
        focusCell(merged.length)
      }

    return (
      <div
        aria-label="Verification code"
        className={cn('flex gap-2', disabled && 'opacity-50', className)}
        role="group"
      >
        {Array.from({ length: slots }, (_, index) => {
          const char = code[index] ?? ''
          const display = char ? (mask ? BULLET : char) : ''
          const isFirstEmpty = index === code.length
          return (
            <input
              key={index}
              ref={(node) => {
                cellRefs.current[index] = node
                if (index !== 0) return
                if (typeof ref === 'function') ref(node)
                else if (ref != null) ref.current = node
              }}
              aria-invalid={error || undefined}
              aria-label={`Digit ${index + 1} of ${slots}`}
              autoComplete="one-time-code"
              autoFocus={autoFocus && isFirstEmpty}
              className={cn(
                'bg-background text-title-3 text-foreground flex h-12 min-h-11 w-12 items-center justify-center rounded-lg border text-center font-semibold',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                'disabled:cursor-not-allowed',
                error ? 'border-destructive' : 'border-border focus-visible:border-ring',
              )}
              disabled={disabled}
              inputMode="numeric"
              onChange={handleChange(index)}
              onFocus={(event) => event.target.select()}
              onKeyDown={handleKeyDown(index)}
              onPaste={handlePaste(index)}
              type="text"
              value={display}
            />
          )
        })}
      </div>
    )
  },
)
PUIPinInput.displayName = 'PUIPinInput'
