import * as React from 'react'

import { cn } from '../../lib/utils'
import { PUIText } from './PUIText'
import { type PUITextAreaOwnProps } from './PUITextArea.types'

export interface PUITextAreaProps
  extends PUITextAreaOwnProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'disabled'> {
  /** Grow the field to fit its content instead of scrolling internally. Off by default. */
  autoGrow?: boolean
}

/**
 * Multiline controlled text field. The textarea twin of PUIInput: same label/hint/error
 * surface and the same border precedence (error > focus ring > default), multiline body.
 *
 * @scope both
 */
export const PUITextArea = React.forwardRef<HTMLTextAreaElement, PUITextAreaProps>(
  function PUITextArea(
    { className, label, hint, error, autoGrow = false, disabled, id, rows = 4, onChange, ...props },
    ref,
  ) {
    const generatedId = React.useId()
    const fieldId = id ?? generatedId
    const errorId = `${fieldId}-error`
    const hintId = `${fieldId}-hint`
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

    const setRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref != null) ref.current = node
      },
      [ref],
    )

    const resize = React.useCallback(() => {
      const node = innerRef.current
      if (!autoGrow || node == null) return
      node.style.height = 'auto'
      node.style.height = `${node.scrollHeight}px`
    }, [autoGrow])

    React.useLayoutEffect(() => {
      resize()
    }, [resize, props.value, props.defaultValue])

    const describedBy =
      [error != null ? errorId : null, hint != null ? hintId : null].filter(Boolean).join(' ') ||
      undefined

    return (
      <div className="flex flex-col gap-2">
        {label != null ? (
          <label htmlFor={fieldId}>
            <PUIText className="font-medium" variant="subheadline">
              {label}
            </PUIText>
          </label>
        ) : null}
        <textarea
          ref={setRef}
          aria-describedby={describedBy}
          aria-invalid={error != null || undefined}
          className={cn(
            'bg-background text-callout text-foreground placeholder:text-muted-foreground flex min-h-11 w-full resize-y rounded-lg border px-4 py-2.5',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            autoGrow && 'resize-none overflow-hidden',
            error != null ? 'border-destructive' : 'border-border',
            className,
          )}
          disabled={disabled}
          id={fieldId}
          onChange={(event) => {
            onChange?.(event)
            resize()
          }}
          rows={rows}
          {...props}
        />
        {error == null && hint != null ? (
          <PUIText className="text-muted-foreground" id={hintId} variant="footnote">
            {hint}
          </PUIText>
        ) : null}
        {error != null ? (
          <p id={errorId} role="alert">
            <PUIText className="text-destructive" variant="footnote">
              {error}
            </PUIText>
          </p>
        ) : null}
      </div>
    )
  },
)
PUITextArea.displayName = 'PUITextArea'
