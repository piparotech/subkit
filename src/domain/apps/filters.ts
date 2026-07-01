import type { AppTenant } from '~/domain/apps/types'

export function filterApps(items: readonly AppTenant[], query: string): AppTenant[] {
  return items.filter((app) =>
    matchesQuery(query, [
      app.name,
      app.bundle,
      app.appleAppId ?? '',
      app.iosBundleId ?? '',
      app.androidPackageName ?? '',
      app.status,
      app.platforms.join(' '),
    ]),
  )
}

export function matchesQuery(query: string, values: readonly string[]): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return values.some((value) => value.toLowerCase().includes(normalized))
}
