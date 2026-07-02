import { PUIText } from '@piparo/cn-web'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { AppAvatar } from '~/domain/apps/AppAvatar'
import { AppCardMetric } from '~/domain/apps/AppCardMetric'
import { sumCurrency, sumNumberText } from '~/domain/dashboard/formatMetrics'
import { MetricCard } from '~/components/ui/MetricCard'
import { RowChevron } from '~/components/ui/RowChevron'
import { SoftTag } from '~/components/ui/SoftTag'
import { appRouteParams } from '~/console/routing'
import { StatusLabel } from '~/components/ui/StatusLabel'
import type { AppTenant } from '~/domain/apps/types'
import type { AppStoreConnectConnection } from '~/integrations/app-store-connect/types'

export function AppsView({
  apps,
  canCreateApps,
  connection,
  isFiltering,
  onCreateApp,
}: {
  apps: AppTenant[]
  canCreateApps: boolean
  connection: AppStoreConnectConnection | null
  isFiltering: boolean
  onCreateApp: () => void
}) {
  const hasAppStoreConnectKey = connection?.hasPrivateKey === true
  return (
    <section className="animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <div className="max-w-[1200px]">
        <div className="mb-[6px] flex items-end justify-between">
          <div>
            <PUIText as="h1" className="m-0 text-[23px] font-bold tracking-[-0.01em]" variant="title2">
              Apps
            </PUIText>
            <p className="mt-[5px] mb-0 text-[13.5px] text-[var(--subkit-dim)]">
              Mobile apps in this workspace. Connect store apps, sync products, then check entitlements from SubKit.
            </p>
          </div>
        </div>

        {apps.length === 0 ? (
          isFiltering ? <SearchEmptyState /> : <WorkspaceSetupEmptyState canCreateApps={canCreateApps} hasAppStoreConnectKey={hasAppStoreConnectKey} onCreateApp={onCreateApp} />
        ) : (
          <>
            <div className="my-[22px] mb-[24px] flex gap-[14px] max-md:flex-col">
              <MetricCard label="Total MRR" value={sumCurrency(apps.map((app) => app.mrr))} />
              <MetricCard label="Active App Users" value={sumNumberText(apps.map((app) => app.activeAppUsers))} />
              <MetricCard label="Apps" value={String(apps.length)} />
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[16px]">
              {apps.map((app) => (
                <Link
                  className="cursor-pointer rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] p-[18px] text-left transition-[box-shadow,border-color,transform] duration-fast hover:-translate-y-[2px] hover:border-[var(--subkit-border-2)] hover:shadow-[0_10px_28px_-12px_rgba(30,30,70,0.22)] motion-reduce:transform-none"
                  key={app.id}
                  params={appRouteParams(app)}
                  preload="intent"
                  to="/$tenantSlug/$appSlug"
                >
                  <div className="flex items-center gap-[12px]">
                    <AppAvatar app={app} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold">{app.name}</div>
                      <div className="truncate font-mono text-[12px] text-[var(--subkit-faint)]">{app.bundle}</div>
                    </div>
                    <StatusLabel label={app.status} tone={app.statusTone} />
                  </div>
                  <div className="my-[14px] flex gap-[6px]">
                    {app.platforms.length === 0 ? (
                      <span className="rounded-[6px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[8px] py-[3px] text-[11px] font-medium text-[var(--subkit-dim)]">
                        iOS pending
                      </span>
                    ) : null}
                    {app.platforms.map((platform) => (
                      <SoftTag key={platform}>{platform}</SoftTag>
                    ))}
                  </div>
                  <div className="flex border-t border-[var(--subkit-border)] pt-[13px]">
                    <AppCardMetric label="MRR" value={app.mrr} />
                    <AppCardMetric label="Active users" value={app.activeAppUsers} />
                    <div className="flex items-center text-[var(--subkit-faint)]">
                      <RowChevron />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function WorkspaceSetupEmptyState({
  canCreateApps,
  hasAppStoreConnectKey,
  onCreateApp,
}: {
  canCreateApps: boolean
  hasAppStoreConnectKey: boolean
  onCreateApp: () => void
}) {
  return (
    <div className="mt-[24px] rounded-[16px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] p-[22px]">
      <div className="max-w-[720px]">
        <div className="text-[18px] font-bold text-[var(--subkit-text)]">Set up this workspace</div>
        <p className="mt-[6px] text-[13.5px] leading-[1.5] text-[var(--subkit-dim)]">
          SubKit needs a store connection before it can become the source of truth for products, App Users, and entitlement checks.
        </p>
      </div>

      <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[12px]">
        <SetupStep
          action={
            hasAppStoreConnectKey ? null : (
              <Link className="font-semibold text-[var(--subkit-accent-d)] hover:underline" preload="intent" to="/settings">
                Open Workspace Settings
              </Link>
            )
          }
          done={hasAppStoreConnectKey}
          index="1"
          text="Upload the App Store Connect key once for this workspace. Secrets stay redacted after upload."
          title="Connect store access"
        />
        <SetupStep
          action={
            canCreateApps ? (
              <button className="font-semibold text-[var(--subkit-accent-d)] hover:underline" onClick={onCreateApp} type="button">
                Create app
              </button>
            ) : null
          }
          disabled={!hasAppStoreConnectKey}
          done={false}
          index="2"
          text="Pick an App Store Connect app and create the SubKit app record."
          title="Create the first app"
        />
        <SetupStep
          disabled
          done={false}
          index="3"
          text="After the app exists, sync the catalog from App Settings and review local products before writes."
          title="Sync catalog intent"
        />
      </div>

      {!canCreateApps ? (
        <div className="mt-[16px] rounded-[10px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[12px] py-[10px] text-[12.5px] text-[var(--subkit-dim)]">
          You can inspect apps after an Admin connects one. Ask a workspace Admin to create the first app or grant you Admin access.
        </div>
      ) : null}
    </div>
  )
}

function SetupStep({
  action,
  disabled = false,
  done,
  index,
  text,
  title,
}: {
  action?: ReactNode
  disabled?: boolean
  done: boolean
  index: string
  text: string
  title: string
}) {
  return (
    <div className="rounded-[13px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] p-[14px]">
      <div className="flex items-center gap-[10px]">
        <span className="grid size-[26px] place-items-center rounded-full border border-[var(--subkit-border-2)] bg-[var(--subkit-panel)] font-mono text-[11px] font-bold text-[var(--subkit-dim)]">
          {done ? '✓' : index}
        </span>
        <div className="text-[13.5px] font-semibold text-[var(--subkit-text)]">{title}</div>
      </div>
      <p className="mb-0 mt-[8px] text-[12.5px] leading-[1.45] text-[var(--subkit-dim)]">{text}</p>
      {action != null ? <div className="mt-[10px] text-[12.5px]">{action}</div> : null}
      {disabled ? <div className="mt-[10px] text-[11.5px] text-[var(--subkit-faint)]">Available after the previous step.</div> : null}
    </div>
  )
}

function SearchEmptyState() {
  return (
    <div className="mt-[20px] rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[18px] py-[16px] text-[13px] text-[var(--subkit-dim)]">
      No apps match this search. Clear the search to return to the workspace list.
    </div>
  )
}
