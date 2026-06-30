import { type ReactNode } from 'react'

/**
 * The wiring PUIField generates once and passes down to whatever control it wraps
 * (Input, Select, RadioGroup, Checkbox). Spreading this onto a control gives it the
 * full a11y contract for free: stable id <-> label association, the invalid flag, and
 * the describedby link to the hint + error region.
 *
 * Mirror this contract across web and native; the platforms differ only in how the
 * control consumes it (web: `id`/`aria-describedby`/`aria-invalid`; native: the
 * control surfaces the error via its destructive border + an assertive live region).
 */
export interface PUIFieldRenderProps {
  /** Stable id for the control; the label is associated to it. */
  id: string
  /** Space-joined ids of the hint and/or error region, or undefined when neither exists. */
  describedby: string | undefined
  /** True when an `error` is present. */
  invalid: boolean
  /** Mirrors the field's disabled state down to the control. */
  disabled: boolean
}

/**
 * Shared semantic prop surface for PUIField, identical on web and native. PUIField OWNS
 * the label + hint + error wiring that controls otherwise inline; a consumer wraps any
 * control via the `children` render-prop and gets the contract through `PUIFieldRenderProps`.
 * Each platform extends this with its host-element props (web: `HTMLAttributes<HTMLDivElement>`
 * minus `children`; native: `ViewProps` minus `children`).
 */
export interface PUIFieldOwnProps {
  /** ReactNode label (i18n-agnostic), associated to the control via the generated id. */
  label?: ReactNode
  /** Optional helper text rendered under the label, linked to the control via describedby. */
  hint?: ReactNode
  /** Presence drives the error region + invalid flag passed down to the control. */
  error?: ReactNode
  disabled?: boolean
  /** Marks the field optional; appends a quiet muted suffix to the label. */
  optional?: boolean
  /** Render-prop receiving the generated wiring to spread onto the wrapped control. */
  children: (field: PUIFieldRenderProps) => ReactNode
}

/** Shared semantic prop surface for the PUIForm wrapper, identical on web and native. */
export interface PUIFormOwnProps {
  children?: ReactNode
}
