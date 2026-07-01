import { SoftTag } from '~/components/ui/SoftTag'
import { StoreId } from '~/domain/stores/StoreId'
import type { SubscriptionProduct } from '~/domain/subscriptions/types'
import { ViewTitle } from '~/components/ui/ViewTitle'

export function SubscriptionsView({
  onOpenSubscription,
  subscriptions,
}: {
  onOpenSubscription: (subscription: SubscriptionProduct) => void
  subscriptions: SubscriptionProduct[]
}) {
  return (
    <section className="animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle description="Products mapped to App Store Connect. Android support comes later." title="Subscriptions" />
      <div className="mt-[20px] overflow-hidden rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] max-lg:overflow-x-auto">
        <div className="min-w-[940px]">
          <div className="grid grid-cols-[1.4fr_1.7fr_0.9fr_0.9fr_0.8fr] gap-[14px] border-b border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[18px] py-[12px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">
            <div>Product</div>
            <div>App Store ID</div>
            <div>Price</div>
            <div>Entitlement</div>
            <div className="text-right">Active Users</div>
          </div>
          {subscriptions.map((subscription) => (
            <button
              className="grid w-full cursor-pointer grid-cols-[1.4fr_1.7fr_0.9fr_0.9fr_0.8fr] items-center gap-[14px] border-b border-[var(--subkit-border)] px-[18px] py-[14px] text-left last:border-b-0 hover:bg-[var(--subkit-panel-2)]"
              key={subscription.identifier}
              onClick={() => onOpenSubscription(subscription)}
              type="button"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold">{subscription.name}</div>
                <div className="font-mono text-[11.5px] text-[var(--subkit-faint)]">
                  {subscription.identifier} · {subscription.duration}
                </div>
              </div>
              <StoreId platform="iOS" value={subscription.iosId} />
              <div className="font-mono text-[13.5px] font-semibold">{subscription.price}</div>
              <div>
                <SoftTag tone="success">{subscription.entitlement}</SoftTag>
              </div>
              <div className="text-right font-mono text-[13.5px] font-semibold">{subscription.activeAppUsers}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
