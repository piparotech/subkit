import { z } from 'zod'

/**
 * The `i18n-translation-pipeline` module config — the knobs for an automated PO-fill run. The source
 * locale and target locales are the host's i18n setup; the provider + caps are the pipeline policy.
 * Per-form Zod schemas are not needed (PO is plain text), so this is the whole config surface.
 */

export const TranslationProvider = z.enum(['deepl', 'llm'])
export type TranslationProvider = z.infer<typeof TranslationProvider>

export const PipelineConfig = z.strictObject({
  /** The catalog source locale (translate FROM this). */
  sourceLocale: z.string().min(2).default('en'),
  /** The locales to fill (translate INTO these). */
  targetLocales: z.array(z.string().min(2)).default([]),
  /** Which provider stamps the marker / is wired in the host adapter. */
  provider: TranslationProvider.default('deepl'),
  /** Units per translator call / persist cycle (controls the max work lost on abort). */
  batchSize: z.number().int().positive().max(200).default(40),
  /** Optional per-run character cap (`--max-chars`); omit for no cap. */
  maxChars: z.number().int().positive().optional(),
})
export type PipelineConfig = z.infer<typeof PipelineConfig>

export type EditableBy = 'piparo' | 'customer'

/** Every config path mapped to who may edit it. The provider/caps are piparo operational policy;
 *  the customer owns which locales their product ships in. */
export const i18nTranslationPipelineConfigRights: Record<string, EditableBy> = {
  sourceLocale: 'piparo',
  targetLocales: 'customer',
  provider: 'piparo',
  batchSize: 'piparo',
  maxChars: 'piparo',
}

export function parsePipelineConfig(input: unknown) {
  return PipelineConfig.safeParse(input)
}
