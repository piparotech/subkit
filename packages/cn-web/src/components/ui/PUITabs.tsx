import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as React from 'react'

import { cn } from '../../lib/utils'
import { type PUITabsProps } from './PUITabs.types'

export type { PUITabItem, PUITabsProps } from './PUITabs.types'

/**
 * Tabs with panels, built on Radix Tabs (Root/List/Trigger/Content): roving focus, arrow-key
 * navigation and full `aria-controls`/`role="tabpanel"` wiring out of the box. The active tab is
 * marked by type weight plus a thin light-indigo indicator under the trigger (never a heavy filled
 * pill); focus-visible shows a ring. Controlled via `value`/`onValueChange`, uncontrolled via
 * `defaultValue`. Token classes only (re-brand by swapping the token set).
 *
 * @scope both
 */
export function PUITabs({
  items,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
}: PUITabsProps) {
  const fallback = items.find((item) => !item.disabled)?.value
  const resolvedDefault = value === undefined ? (defaultValue ?? fallback) : undefined

  return (
    <TabsPrimitive.Root
      className={cn('flex w-full flex-col gap-4', className)}
      defaultValue={resolvedDefault}
      onValueChange={onValueChange}
      value={value}
    >
      <TabsPrimitive.List
        aria-disabled={disabled || undefined}
        className={cn(
          'relative flex items-stretch gap-1 border-b border-border',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            className={cn(
              'group relative inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap',
              'px-3 pb-2.5 pt-2 text-subheadline font-medium transition-colors motion-reduce:transition-none',
              'text-muted-foreground hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              'disabled:pointer-events-none disabled:opacity-50',
              'data-[state=active]:font-semibold data-[state=active]:text-foreground',
            )}
            disabled={disabled || item.disabled}
            key={item.value}
            value={item.value}
          >
            {item.icon != null ? (
              <span aria-hidden className="inline-flex shrink-0 items-center">
                {item.icon}
              </span>
            ) : null}
            {item.label}
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary',
                'opacity-0 transition-opacity duration-fast motion-reduce:transition-none',
                'group-data-[state=active]:opacity-100',
              )}
            />
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          className={cn(
            'text-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'data-[state=active]:animate-in data-[state=active]:fade-in-0 motion-reduce:animate-none',
          )}
          key={item.value}
          value={item.value}
        >
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}

export interface PUITabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  /** When true, the whole strip is dimmed and non-interactive. */
  disabled?: boolean
}

/**
 * Low-level tab strip (Radix TabsList) for composing a custom Tabs layout. Token-styled hairline
 * underline; pair with `PUITab` triggers inside a `TabsPrimitive.Root`.
 *
 * @scope web-only
 */
export const PUITabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  PUITabsListProps
>(function PUITabsList({ className, disabled, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      aria-disabled={disabled || undefined}
      className={cn(
        'relative flex items-stretch gap-1 border-b border-border',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...props}
    />
  )
})

export interface PUITabProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  /** Optional leading glyph slot rendered before the children. */
  icon?: React.ReactNode
}

/**
 * Low-level tab trigger (Radix TabsTrigger). Active = weight + thin accent indicator, focus-visible
 * ring. Compose with `PUITabsList` and `PUITabPanel`.
 *
 * @scope web-only
 */
export const PUITab = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  PUITabProps
>(function PUITab({ className, children, icon, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'group relative inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap',
        'px-3 pb-2.5 pt-2 text-subheadline font-medium transition-colors motion-reduce:transition-none',
        'text-muted-foreground hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:font-semibold data-[state=active]:text-foreground',
        className,
      )}
      {...props}
    >
      {icon != null ? (
        <span aria-hidden className="inline-flex shrink-0 items-center">
          {icon}
        </span>
      ) : null}
      {children}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary',
          'opacity-0 transition-opacity duration-fast motion-reduce:transition-none',
          'group-data-[state=active]:opacity-100',
        )}
      />
    </TabsPrimitive.Trigger>
  )
})

/**
 * Low-level tab panel (Radix TabsContent). Carries the `role="tabpanel"`/`aria-controls` wiring and
 * a focus-visible ring; pair with `PUITab` triggers of the same `value`.
 *
 * @scope web-only
 */
export const PUITabPanel = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function PUITabPanel({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        'text-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'data-[state=active]:animate-in data-[state=active]:fade-in-0 motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  )
})
