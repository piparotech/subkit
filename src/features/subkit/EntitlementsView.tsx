import { PUICard } from '@piparo/cn-web'
import { Circle } from 'lucide-react'

import { SoftTag } from './SoftTag'
import type { Entitlement } from './types'
import { ViewTitle } from './ViewTitle'

export function EntitlementsView({ entitlements }: { entitlements: Entitlement[] }) {
  return (
    <section className="max-w-[980px] animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle description="What a user unlocks. Check entitlements in your app, never product IDs." title="Entitlements" />
      <div className="mt-[20px] flex flex-col gap-[14px]">
        {entitlements.map((entitlement) => (
          <PUICard className="rounded-[14px] border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[20px] py-[18px]" key={entitlement.id}>
            <div className="flex items-center gap-[12px]">
              <div className="flex size-[40px] items-center justify-center rounded-[10px] border border-[var(--subkit-accent-line)] bg-[var(--subkit-accent-soft)]">
                <Circle aria-hidden className="size-[18px] fill-[var(--subkit-accent)] text-[var(--subkit-accent)]" />
              </div>
              <div className="flex-1">
                <div className="font-mono text-[15px] font-semibold">{entitlement.id}</div>
                <div className="mt-[2px] text-[13px] text-[var(--subkit-dim)]">{entitlement.description}</div>
              </div>
              <div className="text-[12px] text-[var(--subkit-faint)]">{entitlement.productCount}</div>
            </div>
            <div className="mt-[14px] flex flex-wrap gap-[8px] border-t border-[var(--subkit-border)] pt-[14px]">
              {entitlement.products.map((product) => (
                <SoftTag key={product}>{product}</SoftTag>
              ))}
            </div>
          </PUICard>
        ))}
      </div>
    </section>
  )
}
