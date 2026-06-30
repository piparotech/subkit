import type { WebAnalyticsConfig } from './config'
import { type ConsentSource, isTrackingAllowed } from './consent'

// Script-lifecycle Engine — decides WHETHER the analytics scripts may be present right now and drives
// an injected `ScriptHost` to load/unload them, so the DOM side is fully testable offline against a
// fake host. This encodes two capability ACs at once:
//   - "die Analytics-Skripte … produktions-only laden"  -> blocked unless config.productionOnly is
//     satisfied (the host reports the environment; dev/preview never loads).
//   - "bei Consent-Widerruf wieder entfernen (opt-out)" -> on a denied/revoked decision the host is
//     told to UNLOAD, not merely to stop sending.
// No DOM/SDK import lives here; the real `document` wiring is a thin adapter the host supplies.

/** The minimal DOM surface the loader drives (a real browser `document` adapter satisfies this). */
export type ScriptHost = {
  /** Idempotently inject the provider scripts. Implementations should no-op if already present. */
  load: () => void
  /** Remove the provider scripts and any globals they installed (opt-out / revoke). */
  unload: () => void
  /** True only in the production runtime (e.g. `process.env.NODE_ENV === 'production'`). */
  isProduction: () => boolean
}

export type ScriptState = 'loaded' | 'unloaded' | 'blocked-non-production'

export type LoaderOptions = {
  host: ScriptHost
  config: WebAnalyticsConfig
  consent: ConsentSource
}

export type ScriptLoader = {
  /**
   * Reconcile the script presence with the current production + consent state. Idempotent — safe to
   * call on mount and after every consent change. Returns the resulting state for the caller/tests.
   */
  sync: () => ScriptState
  /** Current state without mutating (mirrors what the last `sync` produced). */
  state: () => ScriptState
}

/** Pure decision: may the scripts be present at all, given production gate + consent? */
export function shouldLoadScripts(
  config: WebAnalyticsConfig,
  isProduction: boolean,
  allowed: boolean,
): boolean {
  if (config.productionOnly && !isProduction) return false
  return allowed
}

export function createScriptLoader(options: LoaderOptions): ScriptLoader {
  const { host, config, consent } = options
  let current: ScriptState = 'unloaded'

  function sync(): ScriptState {
    if (config.productionOnly && !host.isProduction()) {
      if (current === 'loaded') host.unload()
      current = 'blocked-non-production'
      return current
    }
    const allowed = isTrackingAllowed(consent(), config.consentMode)
    if (allowed) {
      host.load()
      current = 'loaded'
    } else {
      if (current === 'loaded') host.unload()
      current = 'unloaded'
    }
    return current
  }

  return { sync, state: () => current }
}
