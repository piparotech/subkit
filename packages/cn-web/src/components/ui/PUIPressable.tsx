import * as React from 'react'

import { cn } from '../../lib/utils'

/** Parity prop with native. Web has no haptics engine, so this is accepted but inert. */
export type PUIHaptic =
  'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' | false

export interface PUIPressableProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick'
> {
  onPress?: React.MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  /** Apply an active press-scale on press. Default true (motion-reduce gated). */
  scaleOnPress?: boolean
  /** Parity with native; inert on web (no haptics engine). */
  haptic?: PUIHaptic
}

/**
 * Token-styled pressable. With `scaleOnPress` (default) it applies an active
 * press-scale; `haptic` is accepted for native parity but inert on web.
 *
 * @scope both
 */
export const PUIPressable = React.forwardRef<HTMLButtonElement, PUIPressableProps>(
  (
    {
      onPress,
      disabled = false,
      scaleOnPress = true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      haptic = false,
      type = 'button',
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onPress}
      className={cn(
        'duration-fast ease-standard inline-flex min-h-11 min-w-11 items-center justify-center transition-transform select-none',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        scaleOnPress &&
          'active:scale-press motion-reduce:transition-none motion-reduce:active:scale-100',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
)
PUIPressable.displayName = 'PUIPressable'
