import { PUICard } from '@piparo/cn-web'

import { SoftTag } from '~/components/ui/SoftTag'
import type { Offering } from '~/domain/offerings/types'
import { ViewTitle } from '~/components/ui/ViewTitle'

export function OfferingsView({ offerings }: { offerings: Offering[] }) {
  return (
    <section className="max-w-[1080px] animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle description="The set of packages shown on a paywall. Change pricing without an app release." title="Offerings" />
      <div className="mt-[20px] flex flex-col gap-[16px]">
        {offerings.map((offering) => (
          <PUICard className="rounded-[14px] border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[20px] py-[18px]" key={offering.id}>
            <div className="mb-[16px] flex items-center gap-[10px] max-md:flex-wrap">
              <div className="text-[15px] font-semibold">{offering.name}</div>
              <span className="font-mono text-[11.5px] text-[var(--subkit-faint)]">{offering.id}</span>
              <SoftTag tone={offering.tagTone}>{offering.tag}</SoftTag>
              <div className="flex-1" />
              <span className="text-[12.5px] text-[var(--subkit-dim)]">{offering.desc}</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[12px]">
              {offering.packages.map((pkg) => (
                <div className="relative rounded-[11px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] p-[14px]" key={pkg.productId}>
                  {pkg.hasBadge ? (
                    <span className="absolute left-[12px] top-[-9px] rounded-[5px] bg-[var(--subkit-accent)] px-[7px] py-[2px] text-[10px] font-bold text-white">
                      {pkg.badge}
                    </span>
                  ) : null}
                  <div className="text-[14px] font-semibold">{pkg.label}</div>
                  <div className="mt-[8px] font-mono text-[19px] font-bold">{pkg.price}</div>
                  <div className="mt-[8px] border-t border-[var(--subkit-border)] pt-[8px] font-mono text-[11.5px] text-[var(--subkit-faint)]">
                    {pkg.productId}
                  </div>
                </div>
              ))}
            </div>
          </PUICard>
        ))}
      </div>
    </section>
  )
}
