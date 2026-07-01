export interface AppRouteParams {
  appSlug: string
  tenantSlug: string
}

interface AppRouteSource {
  appleAppId: string | null
  id: string
  iosBundleId: string | null
  name: string
  tenantId: string
}

export function idForLabel(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!normalized) throw new Error('Label is required')
  return normalized
}

export function appRouteParams(app: AppRouteSource): AppRouteParams {
  return { appSlug: appRouteSlug(app), tenantSlug: tenantRouteSlug(app.tenantId) }
}

export function appMatchesRouteParams(app: AppRouteSource, params: AppRouteParams): boolean {
  return tenantRouteSlug(app.tenantId) === params.tenantSlug && appRouteSlug(app) === params.appSlug
}

function appRouteSlug(app: AppRouteSource): string {
  const label = app.name.trim() || app.iosBundleId?.trim() || app.appleAppId?.trim() || app.id
  return idForLabel(label)
}

function tenantRouteSlug(tenantId: string): string {
  return idForLabel(tenantId)
}
