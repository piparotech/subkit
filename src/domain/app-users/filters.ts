import { matchesQuery } from '~/domain/apps/filters'
import type { AppUser } from '~/domain/app-users/types'

export function filterAppUsers(items: readonly AppUser[], query: string): AppUser[] {
  return items.filter((appUser) =>
    matchesQuery(query, [
      appUser.appUserId,
      appUser.country,
      appUser.countryCode,
      appUser.primaryEntitlement,
      appUser.primarySource,
      appUser.status,
    ]),
  )
}
