import { cn } from '@piparo/cn-web'

import { AppUserFact } from '~/domain/app-users/AppUserFact'
import { CloseButton } from '~/components/ui/CloseButton'
import { GhostBox } from '~/components/ui/GhostBox'
import { SoftTag } from '~/components/ui/SoftTag'
import { StatusLabel } from '~/components/ui/StatusLabel'
import { toneTextClass } from '~/components/ui/toneClasses'
import { ToneDot } from '~/components/ui/ToneDot'
import type { AppUser } from '~/domain/app-users/types'

export function AppUserPanel({ appUser, onClose }: { appUser: AppUser; onClose: () => void }) {
  return (
    <aside
      aria-label={`App User ${appUser.appUserId}`}
      className="fixed bottom-0 right-0 top-0 z-[90] flex w-[500px] animate-[subkit-slide-in_220ms_cubic-bezier(.2,.7,.2,1)] flex-col bg-[var(--subkit-panel)] shadow-[-16px_0_40px_-16px_rgba(20,20,50,0.28)] max-sm:left-0 max-sm:w-auto"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
    >
      <div className="flex items-start gap-[12px] border-b border-[var(--subkit-border)] px-[22px] py-[18px]">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--subkit-faint)]">App User</div>
          <div className="mt-[3px] break-all font-mono text-[15px] font-bold">{appUser.appUserId}</div>
          <div className="mt-[8px]">
            <StatusLabel label={appUser.status} tone={appUser.statusTone} />
          </div>
        </div>
        <CloseButton onClose={onClose} />
      </div>
      <div className="flex-1 overflow-y-auto p-[22px]">
        <div className="mb-[22px] grid grid-cols-2 gap-[12px]">
          <AppUserFact label="Country" value={appUser.country} />
          <AppUserFact label="Created" value={appUser.createdAt} />
          <AppUserFact label="Last seen" value={appUser.lastSeenAt} />
          <AppUserFact mono label="Lifetime value" value={appUser.ltv} />
        </div>

        <div className="mb-[10px] text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">Entitlement grants</div>
        {appUser.grants.length === 0 ? (
          <GhostBox>
            <div className="text-[12.5px] text-[var(--subkit-dim)]">No entitlement grants recorded for this App User.</div>
          </GhostBox>
        ) : (
          <div className="mb-[24px] rounded-[11px] border border-[var(--subkit-border)]">
            {appUser.grants.map((grant) => (
              <div className="border-b border-[var(--subkit-border)] px-[12px] py-[10px] last:border-b-0" key={grant.id}>
                <div className="flex items-center justify-between gap-[10px]">
                  <SoftTag tone="success">{grant.entitlement}</SoftTag>
                  <StatusLabel label={grant.status} tone={grant.statusTone} />
                </div>
                <div className="mt-[7px] grid grid-cols-2 gap-[6px] text-[11.5px] text-[var(--subkit-dim)]">
                  <span>Source: {grant.source}</span>
                  <span>Product: {grant.product}</span>
                  <span>Starts: {grant.startsAt}</span>
                  <span>Expires: {grant.expiresAt}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-[6px] text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">Purchase history</div>
        {appUser.history.length === 0 ? (
          <GhostBox>
            <div className="text-[12.5px] text-[var(--subkit-dim)]">No purchase events recorded.</div>
          </GhostBox>
        ) : (
          appUser.history.map((event) => (
            <div className="flex items-center gap-[11px] border-b border-[var(--subkit-border)] py-[11px]" key={`${event.type}-${event.date}`}>
              <ToneDot className="shrink-0" tone={event.amountTone} />
              <div className="flex-1">
                <div className="text-[13px] font-medium">{event.type}</div>
                <div className="text-[11.5px] text-[var(--subkit-faint)]">
                  {event.date} · {event.store}
                </div>
              </div>
              <div className={cn('font-mono text-[13px] font-semibold', toneTextClass(event.amountTone))}>{event.amount}</div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
