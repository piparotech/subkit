import { readFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'

import { walkFiles } from './docs-output-lib.mjs'

const root = resolve(import.meta.dirname, '../../..')
const routeRoot = join(root, 'src/routes')
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
  'useSubKitEntitlement',
  'useSubKitIapAutoSync',
  'useSubKitOfferings',
])

const documentedRoutes = new Set([
  '/api/runtime/customer-info',
  '/api/runtime/devices/claim',
  '/api/runtime/devices/list',
  '/api/runtime/devices/renew',
  '/api/runtime/devices/replace',
  '/api/runtime/devices/revoke',
  '/api/runtime/entitlements/check',
  '/api/runtime/iap/reconcile',
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
  '/api/server/offerings',
  '/api/server/payments',
  '/api/server/plan-versions/$planVersionId',
  '/api/server/products',
  '/api/server/promotion-codes/redeem',
  '/api/server/sdk-keys',
  '/api/server/subjects/upsert',
])

const actualRoutes = new Set()
for (const path of await walkFiles(routeRoot)) {
  if (!basename(path).startsWith('api.runtime.') && !basename(path).startsWith('api.server.'))
    continue
  const source = await readFile(path, 'utf8')
  const match = source.match(/createFileRoute\('([^']+)'\)/u)
  if (match?.[1] != null) actualRoutes.add(match[1])
}

for (const route of documentedRoutes) {
  if (!actualRoutes.has(route)) errors.push(`Documented route does not exist: ${route}`)
}
for (const route of actualRoutes) {
  if (!documentedRoutes.has(route)) errors.push(`Public route is missing from docs: ${route}`)
}

if (errors.length > 0) {
  console.error(`Docs contract verification failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(
    `Verified ${documentedRoutes.size} HTTP routes and documented Core, Node, and Expo exports.`,
  )
}
