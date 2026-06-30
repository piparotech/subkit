import * as React from 'react'

import { cn } from '../../lib/utils'
import { PUIText } from './PUIText'
import { type PUIInputOwnProps } from './PUIInput.types'

export interface PUIInputProps
  extends PUIInputOwnProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'disabled'> {
  /** Trailing element rendered inside the field (e.g. a password toggle). */
  addonEnd?: React.ReactNode
}

/**
 * Base controlled text field. Border precedence: error > (focus ring) > default.
 *
 * @scope both
 */
export const PUIInput = React.forwardRef<HTMLInputElement, PUIInputProps>(function PUIInput(
  { className, label, error, addonEnd, disabled, id, ...props },
  ref,
) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  return (
    <div className="flex flex-col gap-2">
      {label != null ? (
        <label htmlFor={inputId}>
          <PUIText className="font-medium" variant="subheadline">
            {label}
          </PUIText>
        </label>
      ) : null}
      <div className="relative flex items-center">
        <input
          ref={ref}
          aria-describedby={error != null ? errorId : undefined}
          aria-invalid={error != null || undefined}
          className={cn(
            'flex min-h-11 w-full rounded-lg border bg-background px-4 text-callout text-foreground placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error != null ? 'border-destructive' : 'border-border focus-within:border-ring',
            addonEnd != null && 'pr-11',
            className,
          )}
          disabled={disabled}
          id={inputId}
          {...props}
        />
        {addonEnd != null ? (
          <div className="absolute right-1 flex items-center">{addonEnd}</div>
        ) : null}
      </div>
      {error != null ? (
        <p id={errorId} role="alert">
          <PUIText className="text-destructive" variant="footnote">
            {error}
          </PUIText>
        </p>
      ) : null}
    </div>
  )
})
PUIInput.displayName = 'PUIInput'
