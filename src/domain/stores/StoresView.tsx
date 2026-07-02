import type { ReactNode } from 'react'

import { ActionButton } from '~/components/ui/ActionButton'
import { EmptySettingsText } from '~/components/ui/EmptySettingsText'
import { SoftTag } from '~/components/ui/SoftTag'
import { StatusLabel } from '~/components/ui/StatusLabel'
import { ViewTitle } from '~/components/ui/ViewTitle'
import type {
  StoreBindingStatus,
  StoreDriftSeverity,
  StoreDriftStatus,
  StoreMutationRisk,
  StoreSyncAppSummary,
  StoreSyncRunStatus,
  StoreSyncStore,
} from '~/domain/stores/types'

export function StoresView({ storeSync }: { storeSync: StoreSyncAppSummary }) {
  const openDriftCount = storeSync.driftItems.filter((item) => item.status === 'open').length
  const blockingDriftCount = storeSync.driftItems.filter((item) => item.status === 'open' && item.severity === 'blocking').length
  const appleBindings = storeSync.bindings.filter((binding) => binding.store === 'apple').length
  const googleBindings = storeSync.bindings.filter((binding) => binding.store === 'google').length

  return (
    <section className="animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle
        description="Read-only store control plane: bindings, drift, imports, sync runs, and confirmed mutation plan history. External stores are not mutated from this screen."
        title="Stores"
      />

      <div className="mt-[14px] rounded-[12px] border border-[var(--subkit-accent-line)] bg-[var(--subkit-accent-soft)] px-[14px] py-[11px] text-[12.5px] leading-[1.45] text-[var(--subkit-accent-d)]">
        Store rows are projections. SubKit remains canonical for product, plan, entitlement, and offering intent. Store writes require a separate preview and explicit confirmation flow.
      </div>

      <div className="mt-[18px] grid grid-cols-4 gap-[12px] max-lg:grid-cols-2 max-sm:grid-cols-1">
        <StoreMetric label="Apple bindings" value={String(appleBindings)} />
        <StoreMetric label="Google bindings" value={String(googleBindings)} />
        <StoreMetric label="Open drift" statusLabel={openDriftCount > 0 ? 'Review' : 'Clear'} tone={openDriftCount > 0 ? 'warning' : 'success'} value={String(openDriftCount)} />
        <StoreMetric label="Blocking drift" statusLabel={blockingDriftCount > 0 ? 'Blocked' : 'Clear'} tone={blockingDriftCount > 0 ? 'destructive' : 'success'} value={String(blockingDriftCount)} />
      </div>

      <section className="mt-[20px] grid grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-[16px] max-xl:grid-cols-1">
        <StorePanel title="Product bindings">
          {storeSync.bindings.length === 0 ? (
            <EmptySettingsText>No store bindings yet. Create a product binding from Products or adopt store products from an import preview.</EmptySettingsText>
          ) : (
            <div className="overflow-hidden rounded-[12px] border border-[var(--subkit-border)] max-lg:overflow-x-auto">
              <div className="min-w-[920px]">
                <div className="grid grid-cols-[0.7fr_1fr_1fr_1.35fr_1fr_0.85fr] gap-[12px] border-b border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[14px] py-[11px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">
                  <div>Store</div>
                  <div>Product</div>
                  <div>Plan</div>
                  <div>Store Product</div>
                  <div>Direction</div>
                  <div className="text-right">Status</div>
                </div>
                {storeSync.bindings.map((binding) => (
                  <div className="grid grid-cols-[0.7fr_1fr_1fr_1.35fr_1fr_0.85fr] items-center gap-[12px] border-b border-[var(--subkit-border)] px-[14px] py-[12px] last:border-b-0" key={binding.id}>
                    <StoreBadge store={binding.store} />
                    <div className="min-w-0 font-mono text-[12px] text-[var(--subkit-dim)]">{binding.productKey}</div>
                    <div className="min-w-0 font-mono text-[12px] text-[var(--subkit-dim)]">{binding.planKey}</div>
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[12px] text-[var(--subkit-text)]">{binding.externalProductId}</div>
                      <div className="truncate font-mono text-[11px] text-[var(--subkit-faint)]">
                        {binding.externalBasePlanId === '' ? binding.environment : `${binding.externalBasePlanId} · ${binding.environment}`}
                      </div>
                    </div>
                    <SoftTag tone="muted">{binding.syncDirection.replaceAll('_', ' ')}</SoftTag>
                    <div className="flex justify-end">
                      <StatusLabel label={binding.bindingStatus.replaceAll('_', ' ')} tone={bindingStatusTone(binding.bindingStatus)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </StorePanel>

        <StorePanel title="Integrations">
          {storeSync.integrations.length === 0 ? (
            <EmptySettingsText>No app-scoped store integration records yet. Workspace App Store Connect credentials can still import Apple data.</EmptySettingsText>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {storeSync.integrations.map((integration) => (
                <div className="rounded-[12px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[12px] py-[11px]" key={integration.id}>
                  <div className="flex items-center justify-between gap-[12px]">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--subkit-text)]">{integration.displayName}</div>
                      <div className="truncate font-mono text-[11.5px] text-[var(--subkit-faint)]">{integration.externalAppId ?? 'no external app id'}</div>
                    </div>
                    <StoreBadge store={integration.store} />
                  </div>
                  <div className="mt-[8px] flex items-center justify-between gap-[12px] text-[12px] text-[var(--subkit-dim)]">
                    <span>{integration.status}</span>
                    <span>{integration.lastSyncAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StorePanel>
      </section>

      <section className="mt-[16px] grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[16px] max-xl:grid-cols-1">
        <StorePanel title="Drift">
          {storeSync.driftItems.length === 0 ? (
            <EmptySettingsText>No drift items detected. Run an import/compare workflow to populate store current state.</EmptySettingsText>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {storeSync.driftItems.slice(0, 8).map((item) => (
                <div className="rounded-[12px] border border-[var(--subkit-border)] px-[12px] py-[11px]" key={item.id}>
                  <div className="flex items-start justify-between gap-[12px]">
                    <div className="min-w-0">
                      <div className="font-mono text-[12px] text-[var(--subkit-text)]">{item.fieldPath}</div>
                      <div className="mt-[3px] truncate text-[12px] text-[var(--subkit-faint)]">{item.bindingLabel} · {item.driftType}</div>
                    </div>
                    <StatusLabel label={item.severity} tone={driftSeverityTone(item.severity)} />
                  </div>
                  <div className="mt-[9px] grid grid-cols-2 gap-[8px] text-[11.5px] max-sm:grid-cols-1">
                    <DriftValue label="SubKit expected" value={item.expected} />
                    <DriftValue label="Store current" value={item.actual} />
                  </div>
                  <div className="mt-[9px] flex items-center justify-between text-[11.5px] text-[var(--subkit-faint)]">
                    <StatusLabel label={item.status} tone={driftStatusTone(item.status)} />
                    <span>{item.detectedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StorePanel>

        <StorePanel title="Imports and sync runs">
          {storeSync.syncRuns.length === 0 && storeSync.snapshots.length === 0 ? (
            <EmptySettingsText>No sync history yet. Use App Settings to fetch Apple catalog data; future store sync workflows will appear here.</EmptySettingsText>
          ) : (
            <div className="flex flex-col gap-[12px]">
              {storeSync.syncRuns.length > 0 ? (
                <div>
                  <div className="mb-[8px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">Sync runs</div>
                  <div className="flex flex-col gap-[8px]">
                    {storeSync.syncRuns.map((run) => (
                      <div className="rounded-[10px] border border-[var(--subkit-border)] px-[11px] py-[9px]" key={run.id}>
                        <div className="flex items-center justify-between gap-[10px]">
                          <div className="flex items-center gap-[7px]">
                            <StoreBadge store={run.store} />
                            <span className="font-mono text-[12px] text-[var(--subkit-text)]">{run.mode.replaceAll('_', ' ')}</span>
                          </div>
                          <StatusLabel label={run.status} tone={runStatusTone(run.status)} />
                        </div>
                        <div className="mt-[6px] text-[12px] text-[var(--subkit-dim)]">{run.summary}</div>
                        {run.errorDetail != null ? <div className="mt-[5px] text-[12px] text-[var(--subkit-red)]">{run.errorDetail}</div> : null}
                        <div className="mt-[6px] text-[11px] text-[var(--subkit-faint)]">{run.startedAt} → {run.finishedAt}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {storeSync.snapshots.length > 0 ? (
                <div>
                  <div className="mb-[8px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">Latest snapshots</div>
                  <div className="flex flex-col gap-[8px]">
                    {storeSync.snapshots.map((snapshot) => (
                      <div className="grid grid-cols-[0.7fr_1fr_1.2fr] items-center gap-[10px] rounded-[10px] border border-[var(--subkit-border)] px-[11px] py-[9px]" key={snapshot.id}>
                        <StoreBadge store={snapshot.store} />
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[12px] text-[var(--subkit-text)]">{snapshot.externalId}</div>
                          <div className="truncate text-[11px] text-[var(--subkit-faint)]">{snapshot.objectType}</div>
                        </div>
                        <div className="min-w-0 text-right">
                          <div className="truncate font-mono text-[11px] text-[var(--subkit-faint)]">{snapshot.contentHash.slice(0, 12)}</div>
                          <div className="text-[11px] text-[var(--subkit-faint)]">{snapshot.fetchedAt}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </StorePanel>
      </section>

      <StorePanel title="Mutation plans">
        {storeSync.mutationPlans.length === 0 ? (
          <div className="flex flex-col gap-[12px]">
            <EmptySettingsText>No mutation plans yet. This is intentional: external store writes are gated behind preview, stale checks, and explicit confirmation.</EmptySettingsText>
            <div className="flex flex-wrap gap-[8px]">
              <ActionButton disabled label="Preview store changes" onPress={noop} />
              <ActionButton disabled label="Confirm external writes" onPress={noop} tone="primary" />
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[12px] border border-[var(--subkit-border)] max-lg:overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[0.75fr_1fr_1fr_1.6fr_1fr] gap-[12px] border-b border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[14px] py-[11px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">
                <div>Store</div>
                <div>Status</div>
                <div>Risk</div>
                <div>Summary</div>
                <div>Preview hash</div>
              </div>
              {storeSync.mutationPlans.map((plan) => (
                <div className="grid grid-cols-[0.75fr_1fr_1fr_1.6fr_1fr] items-center gap-[12px] border-b border-[var(--subkit-border)] px-[14px] py-[12px] last:border-b-0" key={plan.id}>
                  <StoreBadge store={plan.store} />
                  <SoftTag tone="muted">{plan.status.replaceAll('_', ' ')}</SoftTag>
                  <StatusLabel label={plan.risk} tone={riskTone(plan.risk)} />
                  <div className="truncate text-[12px] text-[var(--subkit-dim)]">{plan.summary}</div>
                  <div className="truncate font-mono text-[11.5px] text-[var(--subkit-faint)]">{plan.previewHash}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </StorePanel>
    </section>
  )
}

function StoreMetric({
  label,
  statusLabel,
  value,
  tone = 'muted',
}: {
  label: string
  statusLabel?: string
  value: string
  tone?: 'success' | 'warning' | 'muted' | 'destructive'
}) {
  return (
    <div className="rounded-[12px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[14px] py-[13px]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">{label}</div>
      <div className="mt-[6px] flex items-center gap-[8px]">
        <div className="font-mono text-[20px] font-semibold text-[var(--subkit-text)]">{value}</div>
        {statusLabel != null ? <StatusLabel label={statusLabel} tone={tone} /> : null}
      </div>
    </div>
  )
}

function StorePanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] p-[16px]">
      <div className="mb-[12px] text-[14px] font-semibold text-[var(--subkit-text)]">{title}</div>
      {children}
    </div>
  )
}

function StoreBadge({ store }: { store: StoreSyncStore }) {
  return <SoftTag tone={store === 'apple' ? 'muted' : 'success'}>{store === 'apple' ? 'Apple' : 'Google'}</SoftTag>
}

function DriftValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[10px] py-[8px]">
      <div className="mb-[4px] text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">{label}</div>
      <div className="break-words font-mono text-[11.5px] text-[var(--subkit-dim)]">{value}</div>
    </div>
  )
}

function bindingStatusTone(status: StoreBindingStatus): 'success' | 'warning' | 'muted' | 'destructive' {
  if (status === 'linked' || status === 'synced') return 'success'
  if (status === 'planned' || status === 'drifted' || status === 'missing_in_store' || status === 'missing_in_subkit') return 'warning'
  if (status === 'unsupported') return 'destructive'
  return 'muted'
}

function driftSeverityTone(severity: StoreDriftSeverity): 'success' | 'warning' | 'muted' | 'destructive' {
  if (severity === 'blocking') return 'destructive'
  if (severity === 'warning') return 'warning'
  return 'muted'
}

function driftStatusTone(status: StoreDriftStatus): 'success' | 'warning' | 'muted' | 'destructive' {
  if (status === 'resolved') return 'success'
  if (status === 'open') return 'warning'
  return 'muted'
}

function runStatusTone(status: StoreSyncRunStatus): 'success' | 'warning' | 'muted' | 'destructive' {
  if (status === 'succeeded') return 'success'
  if (status === 'running' || status === 'partial') return 'warning'
  if (status === 'failed') return 'destructive'
  return 'muted'
}

function riskTone(risk: StoreMutationRisk): 'success' | 'warning' | 'muted' | 'destructive' {
  if (risk === 'none' || risk === 'low') return 'success'
  if (risk === 'medium') return 'warning'
  if (risk === 'high' || risk === 'irreversible') return 'destructive'
  return 'muted'
}

function noop(): void {}
