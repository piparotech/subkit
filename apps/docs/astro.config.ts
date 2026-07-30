import tailwindcss from '@tailwindcss/vite'
import icon from 'astro-icon'
import { defineConfig } from 'astro/config'
import nimbus, { defineConfig as defineNimbusConfig } from 'nimbus-docs'

export const nimbusConfig = defineNimbusConfig({
  site: 'https://subkit.piparo.tech/docs/',
  title: 'SubKit',
  description:
    'SubKit is the source of truth for product catalog, commerce, and access. Apps and backends read entitlements; store and payment providers are verified inputs.',
  locale: 'en',
  socialImage: '/docs/og.png',
  head: [
    {
      tag: 'link',
      attrs: { rel: 'icon', type: 'image/png', href: '/docs/favicon.png' },
    },
  ],
  github: 'https://git.piparo.tech/piparo.tech/subkit',
  editPattern: 'https://git.piparo.tech/piparo.tech/subkit/_edit/main/apps/docs/{path}',
  sidebar: {
    items: [
      {
        label: 'Start here',
        items: ['index', 'start/quickstart', 'start/choose-an-integration'],
      },
      {
        label: 'Concepts',
        items: [
          'concepts/source-of-truth',
          'concepts/catalog',
          'concepts/commerce',
          'concepts/access-model',
          'concepts/identity-and-tenancy',
          'concepts/glossary',
        ],
      },
      {
        label: 'Expo / React Native',
        items: [
          'expo/overview',
          'expo/installation',
          'expo/configuration',
          'expo/identity',
          'expo/offerings',
          'expo/purchases',
          'expo/entitlements',
          'expo/restore-and-sync',
          'expo/offline',
          'expo/hooks',
          'expo/migrating-effective-access',
          'expo/conflicts',
          'expo/error-handling',
          'expo/advanced',
          'expo/testing',
          'expo/recipes',
          'expo/troubleshooting',
        ],
      },
      { label: 'Node.js backend', items: ['node/overview'] },
      {
        label: 'Stores',
        items: ['stores/overview', 'stores/apple', 'stores/google-play'],
      },
      { label: 'Reference', items: ['reference/overview', 'reference/api', 'reference/errors'] },
      {
        label: 'Operations',
        items: ['operations/security', 'operations/go-live', 'operations/troubleshooting'],
      },
    ],
    defaultCollapsed: false,
  },
})

export default defineConfig({
  site: nimbusConfig.site,
  base: '/docs',
  integrations: [
    icon({ include: { ph: ['*'] } }),
    nimbus(nimbusConfig, {
      rules: {
        'nimbus/single-h1': 'error',
        'nimbus/heading-hierarchy': 'error',
        'nimbus/code-block-lang': 'warn',
        'nimbus/bare-url': 'warn',
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
})
