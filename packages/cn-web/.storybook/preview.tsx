import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import type { Decorator, Preview } from '@storybook/react-vite'

import { ThemeProvider } from '../src/components/ui/ThemeProvider'
import { type Locale } from '../src/i18n'
import '../src/i18n'
// Token-driven: loads @piparo/design-tokens CSS vars + Tailwind layers.
import '../src/index.css'

const withProviders: Decorator = (Story, ctx) => {
  const scheme = ctx.globals.theme === 'dark' ? 'dark' : 'light'
  const locale = (ctx.globals.locale as Locale) ?? 'en'
  if (i18n.locale !== locale) i18n.activate(locale)
  return (
    <I18nProvider i18n={i18n}>
      <ThemeProvider scheme={scheme} className="flex min-h-[240px] items-center justify-center p-10">
        <Story />
      </ThemeProvider>
    </I18nProvider>
  )
}

const preview: Preview = {
  parameters: { layout: 'fullscreen' },
  globalTypes: {
    theme: {
      description: 'Token color scheme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: 'Locale',
      defaultValue: 'en',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: [
          { value: 'en', title: 'EN' },
          { value: 'de', title: 'DE' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withProviders],
}

export default preview
