import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const contentRoot = join(root, 'apps/docs/src/content/docs')
const errors = []

async function requireExports(moduleName, sourcePath, names) {
  const source = await readFile(sourcePath, 'utf8')
  for (const name of names) {
    const pattern = new RegExp(
      `(?:export\\s+(?:class|const|function)\\s+${name}\\b|export\\s*\\{[^}]*\\b${name}\\b)`,
      'su',
    )
    if (!pattern.test(source)) errors.push(`${moduleName} is missing documented export ${name}`)
  }
}

await requireExports('@piparotech/subkit-core', join(root, 'packages/subkit-core/src/index.ts'), [
  'customerInfoSchema',
  'isEntitlementAccessGranted',
  'resolveEntitlementAccess',
  'iapReconcileRequestSchema',
  'runtimeOfferingsResponseSchema',
  'subKitApiErrorResponseSchema',
])
await requireExports('@piparotech/subkit-node', join(root, 'packages/subkit-node/src/index.ts'), [
  'SubKit',
  'SubKitApiError',
  'isSubKitApiError',
])
await requireExports('@piparotech/subkit-expo', join(root, 'packages/subkit-expo/src/index.ts'), [
  'client',
  'configureSubKit',
  'createMmkvJsonStorage',
  'createStoredPurchaseQueueStore',
  'getSubKitAccessSnapshot',
  'getSubKitHasAccessSnapshot',
  'refreshSubKitAccess',
  'subscribeSubKitAccess',
  'useSubKitAccess',
  'useSubKitHasAccess',
  'useSubKitIapAutoSync',
  'useSubKitOfferings',
])

const expectedDocumentedRoutes = new Set([
  '/api/runtime/customer-info',
  '/api/runtime/devices/claim',
  '/api/runtime/devices/list',
  '/api/runtime/devices/renew',
  '/api/runtime/devices/replace',
  '/api/runtime/devices/revoke',
  '/api/runtime/entitlements/check',
  '/api/runtime/iap/reconcile',
  '/api/runtime/iap/reconcile/$reconcileId',
  '/api/runtime/offerings',
  '/api/server/access-allocations/$allocationId',
  '/api/server/access-pools/$poolId',
  '/api/server/access-pools/$poolId/allocations',
  '/api/server/access-pools/$poolId/reservations',
  '/api/server/access-reservations/$reservationId',
  '/api/server/access-reservations/claim',
  '/api/server/billing-accounts',
  '/api/server/contract-plan-versions',
  '/api/server/contracts',
  '/api/server/contracts/$sourceId/licensee',
  '/api/server/contracts/$sourceId/lifecycle',
  '/api/server/customer-info',
  '/api/server/devices',
  '/api/server/devices/$activationId',
  '/api/server/devices/budget-reset',
  '/api/server/entitlements/check',
  '/api/server/free-enrollments',
  '/api/server/licenses',
  '/api/server/licenses/$sourceId',
  '/api/server/manual-provisions',
  '/api/server/organizations/$organizationSubjectId/memberships',
  '/api/server/offerings',
  '/api/server/payments',
  '/api/server/plan-versions/$planVersionId',
  '/api/server/products',
  '/api/server/promotion-codes/redeem',
  '/api/server/sdk-keys',
  '/api/server/subjects/$subjectId/aliases',
  '/api/server/subjects/upsert',
])

const apiReference = await readFile(join(contentRoot, 'reference/api.md'), 'utf8')
const documentedRoutes = new Set(
  [...apiReference.matchAll(/`(\/api\/(?:runtime|server)\/[^`]+)`/gu)]
    .map((match) => match[1].replaceAll(/:([A-Za-z][A-Za-z0-9]*)/gu, '$$$1'))
    .filter((route) => !route.endsWith('/**')),
)

for (const route of expectedDocumentedRoutes) {
  if (!documentedRoutes.has(route)) errors.push(`Public API reference is missing route: ${route}`)
}
for (const route of documentedRoutes) {
  if (!expectedDocumentedRoutes.has(route))
    errors.push(`Public API reference has an unknown route: ${route}`)
}

if (errors.length > 0) {
  console.error(`Docs contract verification failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(
    `Verified ${expectedDocumentedRoutes.size} documented HTTP routes and Core, Node, and Expo exports.`,
  )
}
