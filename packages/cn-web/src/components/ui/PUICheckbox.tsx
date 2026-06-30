import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/utils'
import { PUIText } from './PUIText'
import { type PUICheckboxOwnProps } from './PUICheckbox.types'

export interface PUICheckboxProps extends PUICheckboxOwnProps {
  id?: string
}

/**
 * Controlled checkbox with an accessible Radix box and an optional label.
 *
 * @scope both
 */
export function PUICheckbox({ checked, onChange, label, error, disabled, id }: PUICheckboxProps) {
  const generatedId = React.useId()
  const checkboxId = id ?? generatedId
  const errorId = `${checkboxId}-error`
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-11 items-start gap-3 py-2.5">
        <CheckboxPrimitive.Root
          aria-describedby={error != null ? errorId : undefined}
          aria-invalid={error != null || undefined}
          checked={checked}
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors motion-reduce:transition-none',
            'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error != null ? 'border-destructive' : 'border-border',
          )}
          disabled={disabled}
          id={checkboxId}
          onCheckedChange={(c) => onChange?.(c === true)}
        >
          <CheckboxPrimitive.Indicator>
            <Check className="h-4 w-4 text-primary-foreground" />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        {label != null ? (
          <label className="cursor-pointer" htmlFor={checkboxId}>
            <PUIText variant="callout">{label}</PUIText>
          </label>
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
}
