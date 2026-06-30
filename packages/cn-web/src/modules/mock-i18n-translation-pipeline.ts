// In-memory mock of the i18n-translation-pipeline seam (the injected `Translator`, normally a DeepL
// or LLM adapter that hits a network endpoint) so the module is fully interactive in the showcase
// without any provider or server. A deterministic offline translator fills empty `msgstr` entries
// from a small canned dictionary, stamps a `# deepl` machine marker, and (for one locale) a per-run
// character cap trips the quota guard mid-run so the "partial progress saved" path is observable.
// Seeded data mirrors the native showcase mock so both tell one story.
import type {
  TranslationRequest,
  TranslationResult,
  Translator,
  UsageReport,
} from '@/lib/i18n-translation-pipeline'

/** One target-locale catalog the demo can fill: the locale code plus its raw `.po` text. */
export type LocaleCatalog = {
  locale: string
  /** Human-readable language name for the picker. */
  name: string
  /** Raw gettext PO text (the host's real `.po` would replace this). */
  po: string
}

// The source UI strings (in a real run these are the host's extracted `.po`). Keyed by msgid so the
// offline translator can return a plausible localized value per target locale.
const DICTIONARY: Record<string, Record<string, string>> = {
  'Welcome back': { de: 'Willkommen zurück', fr: 'Bon retour', es: 'Bienvenido de nuevo' },
  'Sign in': { de: 'Anmelden', fr: 'Se connecter', es: 'Iniciar sesión' },
  'Your cart is empty': {
    de: 'Dein Warenkorb ist leer',
    fr: 'Votre panier est vide',
    es: 'Tu carrito está vacío',
  },
  Checkout: { de: 'Zur Kasse', fr: 'Commander', es: 'Finalizar compra' },
  Settings: { de: 'Einstellungen', fr: 'Paramètres', es: 'Configuración' },
  'Log out': { de: 'Abmelden', fr: 'Se déconnecter', es: 'Cerrar sesión' },
}

const SOURCE_MSGIDS = Object.keys(DICTIONARY)

const HEADER = ['msgid ""', 'msgstr ""', '"Content-Type: text/plain; charset=UTF-8\\n"'].join('\n')

/** Build a PO catalog where the first `prefilled` entries already carry a (human) translation and the
 *  rest are empty: the empty ones are the only entries the pipeline will fill. */
function buildPo(locale: string, prefilled: number): string {
  const blocks = SOURCE_MSGIDS.map((msgid, i) => {
    const existing = i < prefilled ? (DICTIONARY[msgid]?.[locale] ?? '') : ''
    return [`msgid "${msgid}"`, `msgstr "${existing}"`].join('\n')
  })
  return [HEADER, ...blocks].join('\n\n') + '\n'
}

/** Seeded target locales: German is fully untranslated, French is half done (so its coverage bar and
 *  the fill action both show meaningful state), Spanish carries a tiny cap to trip the quota guard
 *  mid-run and demonstrate the partial-progress-saved path. */
export const DEMO_LOCALES: readonly LocaleCatalog[] = [
  { locale: 'de', name: 'German', po: buildPo('de', 0) },
  { locale: 'fr', name: 'French', po: buildPo('fr', 3) },
  { locale: 'es', name: 'Spanish', po: buildPo('es', 0) },
]

/** Units per batch: one entry at a time so the per-batch quota guard can stop the run mid-catalog
 *  (persisting partial progress) rather than rejecting a whole batch at once. */
export const DEMO_BATCH_SIZE = 1

/** A per-run character cap that lets the first entries through, then stops cleanly so the
 *  "character limit reached, partial progress saved" status becomes visible. */
export const DEMO_MAX_CHARS = 22

/** A deterministic, offline translator. Echoes the dictionary value for a known msgid, falls back to
 *  a `[locale] source` tag otherwise, and stamps the `# deepl` machine marker via `marker`. */
export function createMockTranslator(): Translator {
  let spent = 0
  return {
    marker: 'deepl',
    async translate(
      batch: TranslationRequest[],
      targetLocale: string,
    ): Promise<TranslationResult[]> {
      return batch.map((req) => {
        spent += req.text.length
        const hit = DICTIONARY[req.text]?.[targetLocale]
        return { key: req.key, text: hit ?? `[${targetLocale}] ${req.text}` }
      })
    },
    async usage(): Promise<UsageReport> {
      return { characterCount: spent, characterLimit: null }
    },
  }
}
