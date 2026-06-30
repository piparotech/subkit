import * as React from 'react'

import { cn } from '../../lib/utils'
import { type PUISwitchOwnProps } from './PUISwitch.types'

export type { PUISwitchOwnProps } from './PUISwitch.types'

export interface PUISwitchProps extends PUISwitchOwnProps {
  /** DOM id for the underlying control; auto-generated when omitted (web-specific). */
  id?: string
}

export function PUISwitch({
  value,
  onValueChange,
  disabled = false,
  label,
  id,
  className,
}: PUISwitchProps) {
  const generatedId = React.useId()
  const switchId = id ?? generatedId
  const control = (
    <button
      aria-checked={value}
      className={cn(
        'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors motion-reduce:transition-none',
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        value ? 'bg-primary' : 'bg-border',
      )}
      disabled={disabled}
      id={switchId}
      onClick={() => onValueChange?.(!value)}
      role="switch"
      type="button"
    >
      <span
        className={cn(
          'bg-background pointer-events-none block h-5 w-5 rounded-full shadow-sm transition-transform motion-reduce:transition-none',
          value ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
  if (label == null) {
    return <div className={className}>{control}</div>
  }
  return (
    <div className={cn('flex min-h-11 items-center justify-between gap-3', className)}>
      <label className="text-subheadline text-foreground" htmlFor={switchId}>
        {label}
      </label>
      {control}
    </div>
  )
}
