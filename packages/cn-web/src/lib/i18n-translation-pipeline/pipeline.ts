import { isUntranslated } from './coverage'
import { withMarker } from './markers'
import type { PoCatalog } from './po'
import { type QuotaState, canTranslate, remainingFromUsage } from './quota'
import {
  QuotaExhaustedError,
  type TranslationRequest,
  type TranslationResult,
  type Translator,
} from './translator'

// The orchestrator. Given a catalog with empty `msgstr` entries and a target locale, it fills ONLY
// the empty fields via the injected translator, stamps each with the provider marker, batches the
// work, and persists after every batch (an abort loses at most one batch). It pre-checks the quota
// before each batch and stops cleanly once a cap would be crossed — without consuming more budget.

/** One translatable unit: the working-array index of the entry plus, for plurals, which form index
 *  is empty. The index (not the object) is stored so re-filling a multi-plural entry stays stable
 *  even after the entry object is replaced by an earlier unit in the same batch. */
type Unit = { entryIndex: number; pluralIndex?: number; source: string }

export type RunStatus = 'complete' | 'quota' | 'max-chars'

export type PipelineResult = {
  catalog: PoCatalog
  status: RunStatus
  filled: number
  /** Characters sent to the translator this run. */
  charsTranslated: number
  /** Units left untranslated when the run stopped early (0 when status === 'complete'). */
  remaining: number
}

export type RunOptions = {
  catalog: PoCatalog
  targetLocale: string
  translator: Translator
  /** Units per translator call / persist cycle. Default 40. */
  batchSize?: number
  /** Per-run character cap (`--max-chars`). */
  maxChars?: number
  /** Persisted after every batch with the up-to-date catalog (write the PO file here). */
  onBatch?: (
    catalog: PoCatalog,
    info: { filled: number; charsTranslated: number },
  ) => Promise<void> | void
}

function collectUnits(catalog: PoCatalog): Unit[] {
  const units: Unit[] = []
  catalog.entries.forEach((entry, entryIndex) => {
    if (!isUntranslated(entry)) return
    if (entry.msgidPlural !== undefined) {
      const forms = entry.msgstrPlural ?? []
      const count = Math.max(forms.length, 2)
      for (let i = 0; i < count; i++) {
        if ((forms[i] ?? '').trim() === '') {
          units.push({
            entryIndex,
            pluralIndex: i,
            source: i === 0 ? entry.msgid : (entry.msgidPlural ?? entry.msgid),
          })
        }
      }
    } else {
      units.push({ entryIndex, source: entry.msgid })
    }
  })
  return units
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Fill the empty translations of one catalog for one target locale. Returns a NEW catalog (the input
 * is never mutated) plus a status describing why the run ended. Existing translations are preserved;
 * each newly filled entry receives the translator's marker.
 */
export async function runPipeline(options: RunOptions): Promise<PipelineResult> {
  const { catalog, targetLocale, translator } = options
  const batchSize = options.batchSize ?? 40
  const marker = translator.marker

  // Work on a shallow clone of entries; we replace filled entries by identity below.
  const entries = catalog.entries.map((e) => ({ ...e }))
  const working: PoCatalog = { header: catalog.header, entries }

  const units = collectUnits(working)
  const batches = chunk(units, batchSize)

  const quota: QuotaState = { spent: 0, maxChars: options.maxChars }
  if (translator.usage) {
    quota.remaining = remainingFromUsage(await translator.usage())
  }

  let filled = 0
  let charsTranslated = 0
  let status: RunStatus = 'complete'
  let processed = 0

  for (const batch of batches) {
    const batchChars = batch.reduce((n, u) => n + u.source.length, 0)
    const decision = canTranslate(quota, batchChars)
    if (decision.ok === false) {
      status = decision.reason === 'max-chars' ? 'max-chars' : 'quota'
      break
    }

    const requests: TranslationRequest[] = batch.map((u, i) => ({ key: String(i), text: u.source }))

    let results: TranslationResult[]
    try {
      results = await translator.translate(requests, targetLocale)
    } catch (error) {
      if (error instanceof QuotaExhaustedError) {
        status = 'quota'
        break
      }
      throw error
    }

    const byKey = new Map(results.map((r) => [r.key, r.text] as const))
    batch.forEach((unit, i) => {
      const translated = byKey.get(String(i))
      if (translated === undefined) return
      const target = working.entries[unit.entryIndex]
      if (!target) return
      if (unit.pluralIndex !== undefined) {
        const forms = [...(target.msgstrPlural ?? [])]
        while (forms.length <= unit.pluralIndex) forms.push('')
        forms[unit.pluralIndex] = translated
        working.entries[unit.entryIndex] = withMarker({ ...target, msgstrPlural: forms }, marker)
      } else {
        working.entries[unit.entryIndex] = withMarker({ ...target, msgstr: translated }, marker)
      }
      filled += 1
    })

    charsTranslated += batchChars
    quota.spent += batchChars
    processed += batch.length

    await options.onBatch?.(
      { header: working.header, entries: [...working.entries] },
      { filled, charsTranslated },
    )
  }

  return {
    catalog: { header: working.header, entries: working.entries },
    status,
    filled,
    charsTranslated,
    remaining: units.length - processed,
  }
}
