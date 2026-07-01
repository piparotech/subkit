import { useEffect, useMemo } from 'react'

import type { PurchaseSyncCoordinatorOptions } from './coordinator'
import { createPurchaseSyncCoordinator } from './coordinator'

export interface UseSubKitIapAutoSyncOptions extends PurchaseSyncCoordinatorOptions {
  enabled?: boolean
  syncOnMount?: boolean
}

export function useSubKitIapAutoSync(options: UseSubKitIapAutoSyncOptions): void {
  const coordinator = useMemo(
    () => createPurchaseSyncCoordinator(options),
    [options],
  )

  useEffect(() => {
    if (options.enabled === false || options.syncOnMount === false) return

    async function runSync(): Promise<void> {
      await coordinator.syncPurchases({ reason: 'app_start' })
    }

    runSync().catch((error: unknown) => {
      options.logger?.warn('SubKit app-start sync failed', error)
    })
  }, [coordinator, options.enabled, options.logger, options.syncOnMount])
}
