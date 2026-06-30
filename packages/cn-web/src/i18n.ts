import { i18n } from '@lingui/core'

export const locales = { en: 'English', de: 'Deutsch' } as const
export type Locale = keyof typeof locales

// Demo catalogs (apps run `lingui extract`/`compile`). The components stay
// i18n-agnostic — they render the <Trans>/`t` content you pass as children.
const messages: Record<Locale, Record<string, string>> = {
  en: {},
  de: {
    Save: 'Speichern',
    Cancel: 'Abbrechen',
    'Welcome to piparo': 'Willkommen bei piparo',
  },
}

i18n.load({ en: messages.en, de: messages.de })
i18n.activate('en')

export { i18n }
