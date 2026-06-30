import * as React from 'react'

import { cn } from '../../lib/utils'
import { PUIText } from './PUIText'
import {
  type PUIFieldOwnProps,
  type PUIFieldRenderProps,
  type PUIFormOwnProps,
} from './PUIField.types'

export type { PUIFieldRenderProps } from './PUIField.types'

export interface PUIFieldProps
  extends PUIFieldOwnProps,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Override the generated id (e.g. to match an external label). */
  id?: string
}

/**
 * Scope: both. The form-field abstraction. Owns the label + hint + error wiring once
 * (htmlFor/useId, aria-describedby, aria-invalid, role="alert") and hands a control the
 * full a11y contract through the `children` render-prop. Wrap any control (Input, Select,
 * RadioGroup, Checkbox) in PUIField and spread the passed props onto it.
 */
export const PUIField = React.forwardRef<HTMLDivElement, PUIFieldProps>(function PUIField(
  { label, hint, error, disabled = false, optional = false, id, className, children, ...props },
  ref,
) {
  const generatedId = React.useId()
  const fieldId = id ?? generatedId
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`
  const describedby =
    [hint != null ? hintId : null, error != null ? errorId : null].filter(Boolean).join(' ') ||
    undefined

  const field: PUIFieldRenderProps = {
    id: fieldId,
    describedby,
    invalid: error != null,
    disabled,
  }

  return (
    <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
      {label != null ? (
        <label className="flex items-baseline gap-2" htmlFor={fieldId}>
          <PUIText className="font-medium" variant="subheadline">
            {label}
          </PUIText>
          {optional ? (
            <PUIText tone="muted" variant="footnote">
              Optional
            </PUIText>
          ) : null}
        </label>
      ) : null}
      {hint != null ? (
        <PUIText className="block" id={hintId} tone="muted" variant="footnote">
          {hint}
        </PUIText>
      ) : null}
      {children(field)}
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

export interface PUIFormProps
  extends PUIFormOwnProps,
    Omit<React.FormHTMLAttributes<HTMLFormElement>, 'children'> {}

/**
 * Scope: both. Light `<form>` wrapper that groups PUIFields with a column rhythm and an
 * optional `onSubmit`. No chrome of its own; the calm comes from spacing, not borders.
 */
export const PUIForm = React.forwardRef<HTMLFormElement, PUIFormProps>(function PUIForm(
  { className, children, ...props },
  ref,
) {
  return (
    <form ref={ref} className={cn('flex flex-col gap-6', className)} {...props}>
      {children}
    </form>
  )
})
