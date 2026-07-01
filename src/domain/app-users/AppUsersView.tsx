import { SoftTag } from '~/components/ui/SoftTag'
import { StatusLabel } from '~/components/ui/StatusLabel'
import type { AppUser } from '~/domain/app-users/types'
import { ViewTitle } from '~/components/ui/ViewTitle'

export function AppUsersView({ appUsers, onOpenAppUser }: { appUsers: AppUser[]; onOpenAppUser: (appUser: AppUser) => void }) {
  return (
    <section className="animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle description="End users of this app, identified by App User ID and resolved through SubKit entitlement grants." title="App Users" />
      <div className="mt-[20px] overflow-hidden rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] max-lg:overflow-x-auto">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[1.5fr_1.2fr_1.25fr_1fr_1fr_0.8fr] gap-[14px] border-b border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[18px] py-[12px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">
            <div>App User ID</div>
            <div>Country</div>
            <div>Primary Entitlement</div>
            <div>Status</div>
            <div>Source</div>
            <div className="text-right">LTV</div>
          </div>
          {appUsers.map((appUser) => (
            <button
              className="grid w-full cursor-pointer grid-cols-[1.5fr_1.2fr_1.25fr_1fr_1fr_0.8fr] items-center gap-[14px] border-b border-[var(--subkit-border)] px-[18px] py-[14px] text-left last:border-b-0 hover:bg-[var(--subkit-panel-2)]"
              key={appUser.appUserId}
              onClick={() => onOpenAppUser(appUser)}
              type="button"
            >
              <div className="truncate font-mono text-[12.5px] text-[var(--subkit-text)]">{appUser.appUserId}</div>
              <div className="flex items-center gap-[8px] text-[13px]">
                <span className="rounded-[4px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[5px] py-[1px] text-[10px] font-bold text-[var(--subkit-dim)]">
                  {appUser.countryCode}
                </span>
                {appUser.country}
              </div>
              <div>
                <SoftTag tone={appUser.primaryEntitlement === '—' ? 'muted' : 'success'}>{appUser.primaryEntitlement}</SoftTag>
              </div>
              <StatusLabel label={appUser.status} tone={appUser.statusTone} />
              <div className="text-[13px] text-[var(--subkit-dim)]">{appUser.primarySource}</div>
              <div className="text-right font-mono text-[13px] font-semibold">{appUser.ltv}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
