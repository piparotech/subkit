import type { SubKitIapLogger } from './coordinator.js'

const SENSITIVE_KEY =
  /(?:sdk.?key|installation.?id|receipt|purchase.?token|management.?token|device.?token|access.?token|authorization|raw(?:purchase|payload)?)/i
const SENSITIVE_TOKEN = /\b(?:sk_(?:sdk|mgmt|device|ctx|srv)_[A-Za-z0-9._-]+)\b/g

export function createRedactingLogger(
  logger: SubKitIapLogger | undefined,
): SubKitIapLogger | undefined {
  if (logger == null) return undefined
  return {
    debug(message, context) {
      logger.debug(redactString(message), redactValue(context))
    },
    error(message, context) {
      logger.error(redactString(message), redactValue(context))
    },
    warn(message, context) {
      logger.warn(redactString(message), redactValue(context))
    },
  }
}

function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[REDACTED_DEPTH]'
  if (typeof value === 'string') return redactString(value)
  if (value instanceof Error) {
    return { message: redactString(value.message), name: value.name }
  }
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1))
  if (typeof value !== 'object' || value == null) return value
  const entries = Object.entries(value).map(([key, item]) => [
    key,
    SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactValue(item, depth + 1),
  ])
  return Object.fromEntries(entries)
}

function redactString(value: string): string {
  return value.replace(SENSITIVE_TOKEN, '[REDACTED_TOKEN]')
}
