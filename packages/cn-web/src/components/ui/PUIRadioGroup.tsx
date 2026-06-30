import * as React from 'react'

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'

import { cn } from '../../lib/utils'
import { type PUIRadioGroupOwnProps, type PUIRadioOption } from './PUIRadioGroup.types'
import { PUIText } from './PUIText'

export type { PUIRadioOption, PUIRadioVariant } from './PUIRadioGroup.types'

export interface PUIRadioGroupProps extends PUIRadioGroupOwnProps {
  id?: string
}

/**
 * The focusable circular control shared by both variants: a ring (`Item`) with a filled
 * center (`Indicator`) when selected. `aria-describedby` folds the option description into
 * its accessible name. `ringFocus` keeps the control's own focus ring in the `inline`
 * variant; tiles set it false so only the outer `has-focus-visible` ring on the label
 * shows (avoiding a double ring on keyboard focus).
 */
function RadioControl({
  descriptionId,
  disabled,
  error,
  optionId,
  ringFocus,
  value,
}: {
  descriptionId?: string
  disabled: boolean
  error: boolean
  optionId: string
  ringFocus: boolean
  value: string
}) {
  return (
    <RadioGroupPrimitive.Item
      aria-describedby={descriptionId}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors motion-reduce:transition-none',
        ringFocus && 'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed',
        error ? 'border-destructive' : 'data-[state=checked]:border-primary border-border',
      )}
      disabled={disabled}
      id={optionId}
      value={value}
    >
      <RadioGroupPrimitive.Indicator className="bg-primary size-2.5 rounded-full" />
    </RadioGroupPrimitive.Item>
  )
}

/**
 * Single-select option list built on @radix-ui/react-radio-group. Controlled via
 * `value`/`onValueChange`. The accent appears only on the selected dot (One Accent Rule)
 * in the default `inline` variant (dot on the left); the `tile` variant renders each option
 * as a large bordered selection card (optional leading icon + title + optional `description`,
 * radio on the right) that takes the PUI brand selection look when selected — a 2px `primary`
 * border + `accent` tint, no shadow. The option's accessible name folds in its `description`
 * via `aria-describedby`. Scope: both (web + native twin).
 *
 * @scope both
 */
export function PUIRadioGroup({
  options,
  value,
  onValueChange,
  label,
  error,
  variant = 'inline',
  disabled,
  id,
}: PUIRadioGroupProps) {
  const generatedId = React.useId()
  const groupId = id ?? generatedId
  const labelId = `${groupId}-label`
  const errorId = `${groupId}-error`
  const isTile = variant === 'tile'

  return (
    <div className="flex flex-col gap-2">
      {label != null ? (
        <span id={labelId}>
          <PUIText className="font-medium" variant="subheadline">
            {label}
          </PUIText>
        </span>
      ) : null}
      <RadioGroupPrimitive.Root
        aria-describedby={error != null ? errorId : undefined}
        aria-invalid={error != null || undefined}
        aria-labelledby={label != null ? labelId : undefined}
        className={cn('flex flex-col', isTile && 'gap-3')}
        disabled={disabled}
        onValueChange={onValueChange}
        value={value}
      >
        {options.map((option: PUIRadioOption) => {
          const optionId = `${groupId}-${option.value}`
          const descriptionId = `${optionId}-description`
          const optionDisabled = disabled === true || option.disabled === true
          const selected = option.value === value
          const hasDescription = option.description != null
          const textColumn = (
            <span className={cn('flex flex-col gap-1', isTile && 'flex-1')}>
              {option.label != null ? (
                <PUIText className={isTile ? 'font-medium' : undefined} variant="subheadline">
                  {option.label}
                </PUIText>
              ) : null}
              {hasDescription ? (
                <span className="text-footnote text-muted-foreground" id={descriptionId}>
                  {option.description}
                </span>
              ) : null}
            </span>
          )

          if (isTile) {
            return (
              <label
                className={cn(
                  'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-colors motion-reduce:transition-none',
                  'has-focus-visible:ring-ring has-focus-visible:ring-offset-background has-focus-visible:ring-2 has-focus-visible:ring-offset-2',
                  error != null
                    ? 'border-destructive bg-card'
                    : selected
                      ? 'border-primary bg-accent'
                      : 'border-border bg-card hover:border-primary/40',
                  optionDisabled && 'pointer-events-none opacity-50',
                )}
                htmlFor={optionId}
                key={option.value}
              >
                {option.leading != null ? (
                  <span className="flex shrink-0 items-center">{option.leading}</span>
                ) : null}
                {textColumn}
                <RadioControl
                  descriptionId={hasDescription ? descriptionId : undefined}
                  disabled={optionDisabled}
                  error={error != null}
                  optionId={optionId}
                  ringFocus={false}
                  value={option.value}
                />
              </label>
            )
          }

          return (
            <label
              className={cn(
                'flex min-h-11 cursor-pointer items-start gap-3 py-2.5',
                optionDisabled && 'cursor-not-allowed opacity-50',
              )}
              htmlFor={optionId}
              key={option.value}
            >
              <RadioControl
                descriptionId={hasDescription ? descriptionId : undefined}
                disabled={optionDisabled}
                error={error != null}
                optionId={optionId}
                ringFocus
                value={option.value}
              />
              {textColumn}
            </label>
          )
        })}
      </RadioGroupPrimitive.Root>
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
