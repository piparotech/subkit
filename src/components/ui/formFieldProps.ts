import type { PUIFieldRenderProps } from '@piparo/cn-web'

export function inputFieldProps(field: PUIFieldRenderProps) {
  return {
    'aria-describedby': field.describedby,
    'aria-invalid': field.invalid || undefined,
    disabled: field.disabled,
    id: field.id,
  }
}
