// @ts-check
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightLlmsTxt from 'starlight-llms-txt'

// SubKit public developer documentation.
// Canonical Markdown source generates both the website and the curated LLM
// entrypoints (/llms.txt, /llms-small.txt, /llms-full.txt, and topic subsets).
export default defineConfig({
  site: 'https://docs.subkit.piparo.tech',
  integrations: [
    starlight({
      title: 'SubKit',
      description:
        'SubKit is the source of truth for product catalog, commerce, and access. Apps and backends read entitlements; store and payment providers are verified inputs, never competing truth.',
      tagline: 'Catalog, commerce, and access — one source of truth.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/piparotech/subkit',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/piparotech/subkit/edit/main/apps/docs/',
      },
      lastUpdated: true,
      plugins: [
        starlightLlmsTxt({
          projectName: 'SubKit',
          description:
            'SubKit is the source of truth for product catalog, commerce, and access across mobile and web products. Apps and backends read entitlements; Apple, Google, and payment providers are verified inputs, never competing sources of truth.',
          details: [
            '## Invariants an integration must never break',
            '',
            '- SubKit is the source of truth for Catalog, Commerce, and Access.',
            '- Access always follows: Access Source -> Access Pool -> Reservation/Allocation -> Entitlement Grant.',
            '- Apps check entitlements, never subscription, plan, package, or store-product IDs.',
            '- Mobile apps use only public app-bound SDK keys. Server keys belong only in trusted backends.',
            '- Store purchases unlock access only after provider verification and an active entitlement.',
            '- Mutations require the documented capability, an idempotency key, and an audit reason.',
            '- Store reads may run automatically; store writes require preview, explicit confirmation, apply, then verify.',
          ].join('\n'),
          promote: [
            'index*',
            'start/quickstart*',
            'start/choose-an-integration*',
            'concepts/access-model*',
            'operations/security*',
          ],
          exclude: [
            'operations/troubleshooting*',
            'reference/**',
            // Deep mobile pages live in llms-full.txt and the mobile custom set;
            // llms-small.txt keeps only the core mobile path.
            'expo/advanced*',
            'expo/testing*',
            'expo/recipes*',
            'expo/troubleshooting*',
            'expo/conflicts*',
            'expo/error-handling*',
          ],
          customSets: [
            {
              label: 'Mobile (Expo / React Native)',
              description: 'Expo SDK setup, offerings, purchases, restore, and offline access.',
              paths: ['expo/**'],
            },
            {
              label: 'Backend (Node.js)',
              description:
                'Node SDK, server auth, customers, contracts, payments, and access capacity.',
              paths: ['node/**'],
            },
            {
              label: 'Concepts',
              description: 'Source of truth, catalog, commerce, and the access model.',
              paths: ['concepts/**'],
            },
            {
              label: 'Reference and operations',
              description: 'Runtime and server APIs, stores, security, and go-live.',
              paths: ['reference/**', 'stores/**', 'operations/**'],
            },
          ],
        }),
      ],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Overview', slug: 'index' },
            { label: 'Quickstart', slug: 'start/quickstart' },
            { label: 'Choose an integration', slug: 'start/choose-an-integration' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'Source of truth', slug: 'concepts/source-of-truth' },
            { label: 'Catalog', slug: 'concepts/catalog' },
            { label: 'Commerce', slug: 'concepts/commerce' },
            { label: 'Access model', slug: 'concepts/access-model' },
            { label: 'Identity and tenancy', slug: 'concepts/identity-and-tenancy' },
            { label: 'Glossary', slug: 'concepts/glossary' },
          ],
        },
        {
          label: 'Expo / React Native',
          items: [
            { label: 'Overview', slug: 'expo/overview' },
            { label: 'Installation', slug: 'expo/installation' },
            { label: 'Configuration', slug: 'expo/configuration' },
            { label: 'Identifying users', slug: 'expo/identity' },
            { label: 'Offerings & paywalls', slug: 'expo/offerings' },
            { label: 'Making purchases', slug: 'expo/purchases' },
            { label: 'Checking entitlements', slug: 'expo/entitlements' },
            { label: 'React hooks', slug: 'expo/hooks' },
            { label: 'Restore & sync', slug: 'expo/restore-and-sync' },
            { label: 'Offline access', slug: 'expo/offline' },
            { label: 'Ownership & unclaimed', slug: 'expo/conflicts' },
            { label: 'Error handling', slug: 'expo/error-handling' },
            { label: 'Advanced configuration', slug: 'expo/advanced' },
            { label: 'Testing', slug: 'expo/testing' },
            { label: 'Recipes', slug: 'expo/recipes' },
            { label: 'Troubleshooting', slug: 'expo/troubleshooting' },
          ],
        },
        {
          label: 'Node.js backend',
          items: [{ label: 'Overview', slug: 'node/overview' }],
        },
        {
          label: 'Stores',
          items: [
            { label: 'Overview', slug: 'stores/overview' },
            { label: 'Apple App Store setup', slug: 'stores/apple' },
            { label: 'Google Play setup', slug: 'stores/google-play' },
          ],
        },
        {
          label: 'Reference',
          items: [{ label: 'Overview', slug: 'reference/overview' }],
        },
        {
          label: 'Operations',
          items: [
            { label: 'Security model', slug: 'operations/security' },
            { label: 'Go-live checklist', slug: 'operations/go-live' },
            { label: 'Troubleshooting', slug: 'operations/troubleshooting' },
          ],
        },
      ],
    }),
  ],
})
