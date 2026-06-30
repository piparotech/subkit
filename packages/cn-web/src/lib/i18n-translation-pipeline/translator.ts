import type { TranslatorMarker } from './markers'

// The provider seam. The pipeline is provider-neutral: it consumes a `Translator` (DeepL, an LLM,
// or anything else) and never imports a network client itself. Tests inject a deterministic fake;
// real adapters (built in the consuming app) wrap the DeepL `/v2/translate` or an LLM chat call.

/** One unit of text to translate, keyed so the result can be matched back to its entry/form. */
export type TranslationRequest = {
  key: string
  text: string
}

export type TranslationResult = {
  key: string
  text: string
}

/** Remaining API budget, as reported by the provider's usage endpoint (e.g. DeepL `/v2/usage`).
 *  `null` characters mean "unknown / unmetered". */
export type UsageReport = {
  characterCount: number
  characterLimit: number | null
}

export type Translator = {
  /** Which marker this provider stamps onto filled entries. */
  marker: TranslatorMarker
  /** Translate a batch of requests into `targetLocale`. MUST return one result per request key. */
  translate(batch: TranslationRequest[], targetLocale: string): Promise<TranslationResult[]>
  /** Optional usage pre-check for the quota guard. Omit for unmetered providers. */
  usage?(): Promise<UsageReport>
}

/** Raised by an adapter when the provider signals the quota is exhausted (DeepL HTTP 456). The
 *  pipeline catches this, saves partial progress, and aborts WITHOUT consuming more budget. */
export class QuotaExhaustedError extends Error {
  constructor(message = 'translation quota exhausted') {
    super(message)
    this.name = 'QuotaExhaustedError'
  }
}

/**
 * A deterministic, offline translator for tests and dry runs. It echoes the source with a locale tag
 * (`[de] Hello`), so the pipeline's behaviour (idempotency, markers, batching, persistence) is fully
 * testable without any network. Pass `failAfterChars` to simulate quota exhaustion mid-run.
 */
export function createEchoTranslator(options?: {
  marker?: TranslatorMarker
  characterLimit?: number | null
  failAfterChars?: number
}): Translator & { translatedChars: number } {
  const marker = options?.marker ?? 'deepl'
  const failAfterChars = options?.failAfterChars
  const state = { translatedChars: 0 }

  const self: Translator & { translatedChars: number } = {
    marker,
    get translatedChars() {
      return state.translatedChars
    },
    async translate(batch, targetLocale) {
      return batch.map((req) => {
        state.translatedChars += req.text.length
        if (failAfterChars !== undefined && state.translatedChars > failAfterChars) {
          throw new QuotaExhaustedError()
        }
        return { key: req.key, text: `[${targetLocale}] ${req.text}` }
      })
    },
    async usage() {
      return {
        characterCount: state.translatedChars,
        characterLimit: options?.characterLimit ?? null,
      }
    },
  }
  return self
}
