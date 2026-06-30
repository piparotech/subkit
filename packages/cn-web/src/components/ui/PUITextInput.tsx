import * as React from 'react'

import { PUIInput, type PUIInputProps } from './PUIInput'

/**
 * Semantic default text field.
 *
 * @scope both
 */
export const PUITextInput = React.forwardRef<HTMLInputElement, PUIInputProps>(
  function PUITextInput(props, ref) {
    return <PUIInput ref={ref} type="text" {...props} />
  },
)
PUITextInput.displayName = 'PUITextInput'
