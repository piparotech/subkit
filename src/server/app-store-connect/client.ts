import { sign } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { base64UrlEncode } from '~/server/auth/crypto'

const appStoreConnectApiBase = 'https://api.appstoreconnect.apple.com'

export type AppStoreConnectCapabilityKey =
  | 'apps'
  | 'app_metadata'
  | 'subscription_catalog'
  | 'sales_reports'
  | 'testflight_builds'
  | 'customer_reviews'
  | 'provisioning'

export type AppStoreConnectCapabilityStatus = 'available' | 'missing' | 'unknown'

export interface AppStoreConnectCredentials {
  issuerId: string
  keyId: string
  privateKey: string
}

export interface AppStoreConnectCapabilityResult {
  description: string
  detail: string
  key: AppStoreConnectCapabilityKey
  label: string
  status: AppStoreConnectCapabilityStatus
}

export interface AppStoreConnectValidationResult {
  appleAppId: string | null
  bundleId: string | null
  capabilities: AppStoreConnectCapabilityResult[]
  lastError: string | null
  status: 'connected' | 'needs_attention' | 'invalid'
}

export interface AppleCatalogProduct {
  appleId: string
  duration: string
  entitlementKey: string
  kind: 'subscription' | 'in_app_purchase'
  name: string
  productId: string
  state: string
}

export interface AppleSalesReport {
  rawText: string
  rowCount: number
}

export interface AppStoreConnectResource {
  attributes: Record<string, unknown>
  id: string
  type: string
}

interface EndpointProbe {
  detail: string
  status: AppStoreConnectCapabilityStatus
}

export class AppStoreConnectApiError extends Error {
  readonly body: string
  readonly status: number

  constructor(status: number, body: string) {
    super(`App Store Connect API request failed with HTTP ${status}`)
    this.status = status
    this.body = body
  }
}

export async function validateAppStoreConnectAccess({
  bundleId,
  credentials,
  requestedAppleAppId,
  vendorNumber,
}: {
  bundleId: string | null
  credentials: AppStoreConnectCredentials
  requestedAppleAppId: string | null
  vendorNumber: string | null
}): Promise<AppStoreConnectValidationResult> {
  const capabilities: AppStoreConnectCapabilityResult[] = []
  const appsProbe = await probeJson(credentials, '/v1/apps?limit=1')
  capabilities.push(capability('apps', appsProbe))

  if (appsProbe.status === 'missing') {
    return {
      appleAppId: requestedAppleAppId,
      bundleId,
      capabilities: fillRemainingCapabilities(capabilities),
      lastError: appsProbe.detail,
      status: 'invalid',
    }
  }

  const resolved = await resolveApp(credentials, requestedAppleAppId, bundleId)
  const resolvedAppId = resolved.appleAppId
  const resolvedBundleId = resolved.bundleId ?? bundleId

  if (resolved.probe != null) capabilities.push(capability('app_metadata', resolved.probe))

  const appMetadataProbe =
    resolvedAppId == null
      ? unknownProbe('Apple app mapping is missing.')
      : await probeJson(
          credentials,
          `/v1/apps/${encodeURIComponent(resolvedAppId)}/appStoreVersions?limit=1`,
        )
  upsertCapability(capabilities, capability('app_metadata', appMetadataProbe))

  const catalogProbe =
    resolvedAppId == null
      ? unknownProbe('Apple app mapping is missing.')
      : await probeSubscriptionCatalog(credentials, resolvedAppId)
  capabilities.push(capability('subscription_catalog', catalogProbe))

  const buildsProbe =
    resolvedAppId == null
      ? unknownProbe('Apple app mapping is missing.')
      : await probeJson(credentials, `/v1/apps/${encodeURIComponent(resolvedAppId)}/builds?limit=1`)
  capabilities.push(capability('testflight_builds', buildsProbe))

  const reviewsProbe =
    resolvedAppId == null
      ? unknownProbe('Apple app mapping is missing.')
      : await probeJson(
          credentials,
          `/v1/apps/${encodeURIComponent(resolvedAppId)}/customerReviews?limit=1`,
        )
  capabilities.push(capability('customer_reviews', reviewsProbe))

  const provisioningProbe =
    resolvedBundleId == null || resolvedBundleId.trim() === ''
      ? unknownProbe('Bundle ID is missing.')
      : await probeJson(
          credentials,
          `/v1/bundleIds?filter[identifier]=${encodeURIComponent(resolvedBundleId)}&limit=1`,
        )
  capabilities.push(capability('provisioning', provisioningProbe))

  const salesProbe =
    vendorNumber == null || vendorNumber.trim() === ''
      ? unknownProbe('Vendor Number is missing; Sales Reports cannot be checked yet.')
      : await probeSalesReport(credentials, vendorNumber.trim(), defaultReportDate())
  capabilities.push(capability('sales_reports', salesProbe))

  const missingRequired = capabilities.some(
    (item) => item.key === 'apps' && item.status === 'missing',
  )
  const availableCount = capabilities.filter((item) => item.status === 'available').length
  const missingCount = capabilities.filter((item) => item.status === 'missing').length
  const status = missingRequired
    ? 'invalid'
    : missingCount > 0 || availableCount < 2
      ? 'needs_attention'
      : 'connected'
  const firstProblem =
    capabilities.find((item) => item.status === 'missing') ??
    capabilities.find((item) => item.status === 'unknown')

  return {
    appleAppId: resolvedAppId,
    bundleId: resolvedBundleId,
    capabilities,
    lastError: status === 'connected' ? null : (firstProblem?.detail ?? null),
    status,
  }
}

export async function fetchAppleCatalogProducts(
  credentials: AppStoreConnectCredentials,
  appleAppId: string,
): Promise<AppleCatalogProduct[]> {
  const products: AppleCatalogProduct[] = []
  const groups = await getAllAppStoreConnectResources(
    credentials,
    `/v1/apps/${encodeURIComponent(appleAppId)}/subscriptionGroups?limit=200`,
  )

  for (const group of groups) {
    const subscriptions = await getAllAppStoreConnectResources(
      credentials,
      `/v1/subscriptionGroups/${encodeURIComponent(group.id)}/subscriptions?limit=200`,
    )
    for (const subscription of subscriptions) {
      const productId = readString(subscription.attributes, 'productId') ?? subscription.id
      products.push({
        appleId: subscription.id,
        duration: readSubscriptionPeriod(subscription.attributes),
        entitlementKey: `apple:${readString(group.attributes, 'referenceName') ?? group.id}`,
        kind: 'subscription',
        name: readString(subscription.attributes, 'name') ?? productId,
        productId,
        state: readString(subscription.attributes, 'state') ?? 'unknown',
      })
    }
  }

  const inAppPurchases = await getAllAppStoreConnectResources(
    credentials,
    `/v1/apps/${encodeURIComponent(appleAppId)}/inAppPurchasesV2?limit=200`,
  )
  for (const purchase of inAppPurchases) {
    const productId = readString(purchase.attributes, 'productId') ?? purchase.id
    products.push({
      appleId: purchase.id,
      duration: readString(purchase.attributes, 'inAppPurchaseType') ?? 'in-app purchase',
      entitlementKey: 'apple:in-app-purchases',
      kind: 'in_app_purchase',
      name: readString(purchase.attributes, 'name') ?? productId,
      productId,
      state: readString(purchase.attributes, 'state') ?? 'unknown',
    })
  }

  return dedupeProducts(products)
}

export async function downloadDailySalesReport({
  credentials,
  reportDate,
  vendorNumber,
}: {
  credentials: AppStoreConnectCredentials
  reportDate: string
  vendorNumber: string
}): Promise<AppleSalesReport> {
  const response = await fetchAppStoreConnect(
    credentials,
    salesReportPath(vendorNumber, reportDate),
    'application/a-gzip',
  )
  if (!response.ok) throw new AppStoreConnectApiError(response.status, await response.text())

  const compressed = Buffer.from(await response.arrayBuffer())
  const rawText = decodeReportBody(compressed)
  return { rawText, rowCount: countReportRows(rawText) }
}

function createJwt(credentials: AppStoreConnectCredentials): string {
  const now = Math.floor(Date.now() / 1000)
  const header = base64UrlEncode(
    JSON.stringify({ alg: 'ES256', kid: credentials.keyId, typ: 'JWT' }),
  )
  const payload = base64UrlEncode(
    JSON.stringify({
      aud: 'appstoreconnect-v1',
      exp: now + 300,
      iat: now,
      iss: credentials.issuerId,
    }),
  )
  const signingInput = `${header}.${payload}`
  const signature = sign('sha256', Buffer.from(signingInput), {
    dsaEncoding: 'ieee-p1363',
    key: credentials.privateKey,
  })
  return `${signingInput}.${base64UrlEncode(signature)}`
}

async function fetchAppStoreConnect(
  credentials: AppStoreConnectCredentials,
  path: string,
  accept = 'application/json',
): Promise<Response> {
  const url = path.startsWith('https://') ? path : `${appStoreConnectApiBase}${path}`
  return fetch(url, {
    headers: {
      Accept: accept,
      Authorization: `Bearer ${createJwt(credentials)}`,
    },
  })
}

export async function requestAppStoreConnectJson(
  credentials: AppStoreConnectCredentials,
  path: string,
): Promise<unknown> {
  const response = await fetchAppStoreConnect(credentials, path)
  const text = await response.text()
  if (!response.ok) throw new AppStoreConnectApiError(response.status, text)
  if (text.trim() === '') return {}
  return JSON.parse(text)
}

export async function getAppStoreConnectResourcePage(
  credentials: AppStoreConnectCredentials,
  path: string,
): Promise<AppStoreConnectResource[]> {
  return readResourceArray(await requestAppStoreConnectJson(credentials, path))
}

export async function getAllAppStoreConnectResources(
  credentials: AppStoreConnectCredentials,
  path: string,
): Promise<AppStoreConnectResource[]> {
  const resources: AppStoreConnectResource[] = []
  let nextPath: string | null = path

  while (nextPath != null) {
    const json = await requestAppStoreConnectJson(credentials, nextPath)
    resources.push(...readResourceArray(json))
    nextPath = readNextPath(json)
  }

  return resources
}

async function probeJson(
  credentials: AppStoreConnectCredentials,
  path: string,
): Promise<EndpointProbe> {
  try {
    await requestAppStoreConnectJson(credentials, path)
    return { detail: 'Endpoint is reachable.', status: 'available' }
  } catch (error) {
    return probeFromError(error)
  }
}

async function probeSalesReport(
  credentials: AppStoreConnectCredentials,
  vendorNumber: string,
  reportDate: string,
): Promise<EndpointProbe> {
  try {
    await downloadDailySalesReport({ credentials, reportDate, vendorNumber })
    return { detail: `Daily Sales Report for ${reportDate} is reachable.`, status: 'available' }
  } catch (error) {
    if (error instanceof AppStoreConnectApiError && error.status === 404) {
      return {
        detail: `No daily Sales Report was available for ${reportDate}; credentials were accepted.`,
        status: 'unknown',
      }
    }
    return probeFromError(error)
  }
}

async function probeSubscriptionCatalog(
  credentials: AppStoreConnectCredentials,
  appleAppId: string,
): Promise<EndpointProbe> {
  const subscriptionGroupsProbe = await probeJson(
    credentials,
    `/v1/apps/${encodeURIComponent(appleAppId)}/subscriptionGroups?limit=1`,
  )
  const inAppPurchasesProbe = await probeJson(
    credentials,
    `/v1/apps/${encodeURIComponent(appleAppId)}/inAppPurchasesV2?limit=1`,
  )

  if (
    subscriptionGroupsProbe.status === 'available' ||
    inAppPurchasesProbe.status === 'available'
  ) {
    return { detail: 'Subscription groups or in-app purchases are reachable.', status: 'available' }
  }
  if (subscriptionGroupsProbe.status === 'missing' && inAppPurchasesProbe.status === 'missing') {
    return { detail: 'No access to subscription groups or in-app purchases.', status: 'missing' }
  }
  return {
    detail: `${subscriptionGroupsProbe.detail} ${inAppPurchasesProbe.detail}`,
    status: 'unknown',
  }
}

async function resolveApp(
  credentials: AppStoreConnectCredentials,
  requestedAppleAppId: string | null,
  requestedBundleId: string | null,
): Promise<{ appleAppId: string | null; bundleId: string | null; probe: EndpointProbe | null }> {
  if (requestedAppleAppId != null && requestedAppleAppId.trim() !== '') {
    const appleAppId = requestedAppleAppId.trim()
    try {
      const json = await requestAppStoreConnectJson(
        credentials,
        `/v1/apps/${encodeURIComponent(appleAppId)}`,
      )
      const resource = readSingleResource(json)
      return {
        appleAppId,
        bundleId:
          resource == null
            ? requestedBundleId
            : (readString(resource.attributes, 'bundleId') ?? requestedBundleId),
        probe: { detail: 'Mapped Apple App ID is reachable.', status: 'available' },
      }
    } catch (error) {
      return { appleAppId, bundleId: requestedBundleId, probe: probeFromError(error) }
    }
  }

  if (requestedBundleId != null && requestedBundleId.trim() !== '') {
    const cleanBundleId = requestedBundleId.trim()
    try {
      const json = await requestAppStoreConnectJson(
        credentials,
        `/v1/apps?filter[bundleId]=${encodeURIComponent(cleanBundleId)}&limit=1`,
      )
      const [resource] = readResourceArray(json)
      if (resource == null) {
        return {
          appleAppId: null,
          bundleId: cleanBundleId,
          probe: {
            detail: `No App Store Connect app matched ${cleanBundleId}.`,
            status: 'missing',
          },
        }
      }
      return {
        appleAppId: resource.id,
        bundleId: readString(resource.attributes, 'bundleId') ?? cleanBundleId,
        probe: { detail: 'Bundle ID resolved to an App Store Connect app.', status: 'available' },
      }
    } catch (error) {
      return { appleAppId: null, bundleId: cleanBundleId, probe: probeFromError(error) }
    }
  }

  return {
    appleAppId: null,
    bundleId: null,
    probe: {
      detail: 'Apple App ID or Bundle ID is required for app-level checks.',
      status: 'unknown',
    },
  }
}

function probeFromError(error: unknown): EndpointProbe {
  if (error instanceof AppStoreConnectApiError) {
    if (error.status === 401 || error.status === 403) {
      return {
        detail: `Missing permission or invalid key for this endpoint (HTTP ${error.status}).`,
        status: 'missing',
      }
    }
    if (error.status === 404)
      return { detail: 'Endpoint or mapped app was not found.', status: 'missing' }
    return { detail: `Endpoint returned HTTP ${error.status}.`, status: 'unknown' }
  }
  if (error instanceof Error) return { detail: error.message, status: 'unknown' }
  return { detail: 'Unknown App Store Connect error.', status: 'unknown' }
}

function capability(
  key: AppStoreConnectCapabilityKey,
  probe: EndpointProbe,
): AppStoreConnectCapabilityResult {
  const meta = capabilityMeta(key)
  return { ...meta, detail: probe.detail, key, status: probe.status }
}

function capabilityMeta(key: AppStoreConnectCapabilityKey): { description: string; label: string } {
  switch (key) {
    case 'apps':
      return { description: 'List apps and resolve bundle IDs.', label: 'Apps' }
    case 'app_metadata':
      return {
        description: 'Read app versions, metadata, and release state.',
        label: 'Metadata & releases',
      }
    case 'subscription_catalog':
      return {
        description: 'Read subscription groups and in-app purchases.',
        label: 'Subscription catalog',
      }
    case 'sales_reports':
      return {
        description: 'Download Sales and Trends reports with a Vendor Number.',
        label: 'Sales reports',
      }
    case 'testflight_builds':
      return { description: 'Read builds and TestFlight readiness.', label: 'TestFlight builds' }
    case 'customer_reviews':
      return {
        description: 'Read customer reviews for support and release monitoring.',
        label: 'Customer reviews',
      }
    case 'provisioning':
      return { description: 'Read bundle IDs and provisioning metadata.', label: 'Provisioning' }
  }
}

function fillRemainingCapabilities(
  existing: AppStoreConnectCapabilityResult[],
): AppStoreConnectCapabilityResult[] {
  const keys: AppStoreConnectCapabilityKey[] = [
    'apps',
    'app_metadata',
    'subscription_catalog',
    'sales_reports',
    'testflight_builds',
    'customer_reviews',
    'provisioning',
  ]
  const existingKeys = new Set(existing.map((item) => item.key))
  return [
    ...existing,
    ...keys
      .filter((key) => !existingKeys.has(key))
      .map((key) => capability(key, unknownProbe('Skipped because base app access failed.'))),
  ]
}

function upsertCapability(
  items: AppStoreConnectCapabilityResult[],
  item: AppStoreConnectCapabilityResult,
): void {
  const index = items.findIndex((candidate) => candidate.key === item.key)
  if (index === -1) {
    items.push(item)
    return
  }
  items[index] = item
}

function unknownProbe(detail: string): EndpointProbe {
  return { detail, status: 'unknown' }
}

function defaultReportDate(): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

function salesReportPath(vendorNumber: string, reportDate: string): string {
  const params = new URLSearchParams({
    'filter[frequency]': 'DAILY',
    'filter[reportDate]': reportDate,
    'filter[reportSubType]': 'SUMMARY',
    'filter[reportType]': 'SALES',
    'filter[vendorNumber]': vendorNumber,
    'filter[version]': '1_0',
  })
  return `/v1/salesReports?${params.toString()}`
}

function readResourceArray(json: unknown): AppStoreConnectResource[] {
  if (!isRecord(json)) return []
  const data = json.data
  if (!Array.isArray(data)) return []
  return data.flatMap((item) => {
    const resource = readResource(item)
    return resource == null ? [] : [resource]
  })
}

function readSingleResource(json: unknown): AppStoreConnectResource | null {
  if (!isRecord(json)) return null
  return readResource(json.data)
}

function readResource(value: unknown): AppStoreConnectResource | null {
  if (!isRecord(value)) return null
  const id = value.id
  const type = value.type
  if (typeof id !== 'string' || typeof type !== 'string') return null
  const attributes = isRecord(value.attributes) ? value.attributes : {}
  return { attributes, id, type }
}

function readNextPath(json: unknown): string | null {
  if (!isRecord(json)) return null
  const links = json.links
  if (!isRecord(links)) return null
  const next = links.next
  if (typeof next !== 'string' || next.trim() === '') return null
  if (next.startsWith(appStoreConnectApiBase)) return next.slice(appStoreConnectApiBase.length)
  return next
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readSubscriptionPeriod(attributes: Record<string, unknown>): string {
  const direct = readString(attributes, 'subscriptionPeriod')
  if (direct != null) return direct
  const period = attributes.subscriptionPeriod
  if (isRecord(period))
    return readString(period, 'unit') ?? readString(period, 'value') ?? 'subscription'
  return 'subscription'
}

function dedupeProducts(products: AppleCatalogProduct[]): AppleCatalogProduct[] {
  const seen = new Set<string>()
  const deduped: AppleCatalogProduct[] = []
  for (const product of products) {
    if (seen.has(product.productId)) continue
    seen.add(product.productId)
    deduped.push(product)
  }
  return deduped
}

function decodeReportBody(buffer: Buffer): string {
  try {
    return gunzipSync(buffer).toString('utf8')
  } catch {
    return buffer.toString('utf8')
  }
}

function countReportRows(rawText: string): number {
  const lines = rawText.split(/\r?\n/).filter((line) => line.trim() !== '')
  return Math.max(0, lines.length - 1)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
