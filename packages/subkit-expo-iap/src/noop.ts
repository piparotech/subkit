import type { SubKitIapLogger } from './coordinator.js'

export const noopSubKitIapLogger: SubKitIapLogger = {
  debug() {},
  error() {},
  warn() {},
}
