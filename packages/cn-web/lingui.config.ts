import { defineConfig } from '@lingui/cli'
import { formatter } from '@lingui/format-po'

// cn-web is i18n-agnostic (pass <Trans>/`t` as children). This config lets the
// package + its Storybook demonstrate <Trans>; apps own their own catalogs.
export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'de'],
  catalogs: [
    {
      path: 'i18n/locales/{locale}/messages',
      include: ['src'],
      exclude: ['**/node_modules/**'],
    },
  ],
  format: formatter(),
})
