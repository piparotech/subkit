import { PUIButton, PUIText } from '@piparo/cn-web'

import type { TenantDraft, TenantDraftField } from '~/domain/tenants/types'

export function NewTenantDialog({
  draft,
  onChange,
  onClose,
  onCreate,
}: {
  draft: TenantDraft
  onChange: (field: TenantDraftField, value: string) => void
  onClose: () => void
  onCreate: () => void
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-[24px]">
      <div
        aria-label="Create workspace"
        aria-modal="true"
        className="w-[520px] max-w-full overflow-hidden rounded-[16px] bg-[var(--subkit-panel)] shadow-[0_24px_60px_-16px_rgba(20,20,50,0.4)] animate-[subkit-pop-in_180ms_ease]"
        role="dialog"
        tabIndex={-1}
      >
        <div className="px-[24px] pt-[20px]">
          <PUIText as="h2" className="text-[18px] font-bold" variant="title3">
            Create workspace
          </PUIText>
          <div className="mt-[4px] text-[13px] text-[var(--subkit-dim)]">Admins are assigned to workspaces they create automatically.</div>
        </div>
        <div className="flex flex-col gap-[12px] px-[24px] py-[18px]">
          <label className="flex flex-col gap-[6px] text-[12.5px] font-semibold text-[var(--subkit-text)]">
            Workspace name
            <input
              className="rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[11px] py-[9px] font-sans text-[13px] text-[var(--subkit-text)] outline-none"
              onChange={(event) => onChange('name', event.target.value)}
              placeholder="Customer GmbH"
              value={draft.name}
            />
          </label>
          <label className="flex flex-col gap-[6px] text-[12.5px] font-semibold text-[var(--subkit-text)]">
            Workspace ID
            <input
              className="rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[11px] py-[9px] font-mono text-[13px] text-[var(--subkit-text)] outline-none"
              onChange={(event) => onChange('id', event.target.value)}
              placeholder="customer-gmbh"
              value={draft.id}
            />
          </label>
          <div className="grid grid-cols-[1fr_1.4fr] gap-[10px] max-sm:grid-cols-1">
            <label className="flex flex-col gap-[6px] text-[12.5px] font-semibold text-[var(--subkit-text)]">
              Initials
              <input
                className="rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[11px] py-[9px] font-mono text-[13px] text-[var(--subkit-text)] outline-none"
                onChange={(event) => onChange('initials', event.target.value.toUpperCase())}
                placeholder="CG"
                value={draft.initials}
              />
            </label>
            <label className="flex flex-col gap-[6px] text-[12.5px] font-semibold text-[var(--subkit-text)]">
              Color
              <input
                className="rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[11px] py-[9px] font-mono text-[13px] text-[var(--subkit-text)] outline-none"
                onChange={(event) => onChange('color', event.target.value)}
                value={draft.color}
              />
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-[10px] border-t border-[var(--subkit-border)] px-[24px] py-[16px]">
          <PUIButton className="rounded-[9px]" label="Cancel" onPress={onClose} variant="outline" />
          <PUIButton className="rounded-[9px]" disabled={draft.name.trim() === '' || draft.id.trim() === ''} label="Create workspace" onPress={onCreate} />
        </div>
      </div>
    </div>
  )
}
