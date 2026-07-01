import { matchesQuery } from '~/domain/apps/filters'
import type { SubscriptionProduct } from '~/domain/subscriptions/types'

export function filterSubscriptions(items: readonly SubscriptionProduct[], query: string): SubscriptionProduct[] {
  return items.filter((subscription) =>
    matchesQuery(query, [
      subscription.name,
      subscription.identifier,
      subscription.iosId,
      subscription.androidId,
      subscription.price,
      subscription.entitlement,
      subscription.duration,
    ]),
  )
}
