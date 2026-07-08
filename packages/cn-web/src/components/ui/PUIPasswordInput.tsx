import * as React from 'react'

import { Eye, EyeOff } from 'lucide-react'

import { PUIInput, type PUIInputProps } from './PUIInput'
import { type PUIPasswordToggleProps } from './PUIPasswordInput.types'

export interface PUIPasswordInputProps
  extends Omit<PUIInputProps, 'type' | 'addonEnd'>, PUIPasswordToggleProps {}

/**
 * Password field with an accessible show/hide toggle (disabled with the field).
 *
 * @scope both
 */
export const PUIPasswordInput = React.forwardRef<HTMLInputElement, PUIPasswordInputProps>(
  function PUIPasswordInput(
    { showLabel = 'Show password', hideLabel = 'Hide password', disabled, ...props },
    ref,
  ) {
    const [visible, setVisible] = React.useState(false)
    const toggleLabel = visible ? hideLabel : showLabel
    return (
      <PUIInput
        ref={ref}
        addonEnd={
          <button
            aria-label={toggleLabel}
            className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex min-h-11 min-w-11 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            disabled={disabled}
            onClick={() => setVisible((v) => !v)}
            type="button"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        autoComplete="current-password"
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        {...props}
      />
    )
  },
)
PUIPasswordInput.displayName = 'PUIPasswordInput'
