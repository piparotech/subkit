import type { TenantRole } from '~/domain/tenants/types'

export function RoleSelect({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean
  onChange: (role: TenantRole) => void
  value: TenantRole
}) {
  return (
    <select
      className="min-h-[36px] rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[10px] py-[7px] text-[12.5px] font-semibold text-[var(--subkit-text)] outline-none disabled:opacity-50"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value === 'admin' ? 'admin' : 'developer')}
      value={value}
    >
      <option value="developer">Developer</option>
      <option value="admin">Admin</option>
    </select>
  )
}
