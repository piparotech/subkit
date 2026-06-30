import * as React from 'react'

import { PUIInput, type PUIInputProps } from './PUIInput'

/**
 * Email-tuned field. No validation (pair with a Form rule).
 *
 * @scope both
 */
export const PUIEmailInput = React.forwardRef<HTMLInputElement, PUIInputProps>(
  function PUIEmailInput(props, ref) {
    return (
      <PUIInput
        ref={ref}
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        type="email"
        {...props}
      />
    )
  },
)
PUIEmailInput.displayName = 'PUIEmailInput'
