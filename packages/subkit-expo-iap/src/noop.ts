import type { SubKitIapLogger } from './coordinator'

export const noopSubKitIapLogger: SubKitIapLogger = {
  debug() {},
  error() {},
  warn() {},
}
