import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

import { walkFiles } from './docs-output-lib.mjs'

const root = resolve(import.meta.dirname, '../../..')
const contentRoot = join(root, 'apps/docs/src/content/docs')
const temporary = await mkdtemp(join(root, '.docs-snippets-'))
const errors = []
const snippets = []

try {
  for (const path of await walkFiles(contentRoot)) {
    if (!path.endsWith('.md') && !path.endsWith('.mdx')) continue
    const source = await readFile(path, 'utf8')
    const lines = source.split('\n')

    for (let index = 0; index < lines.length; index += 1) {
      const opening = lines[index].match(/^```(ts|tsx|typescript)(?:\s+(\S+))?\s*$/u)
      if (opening == null) continue

      const language = opening[1]
      const mode = opening[2]
      const line = index + 1
      if (mode !== 'compile') {
        errors.push(`${relative(root, path)}:${line} must declare the \"compile\" fence mode`)
      }

      const body = []
      index += 1
      while (index < lines.length && !lines[index].startsWith('```')) {
        body.push(lines[index])
        index += 1
      }
      if (index === lines.length) {
        errors.push(`${relative(root, path)}:${line} has no closing code fence`)
        continue
      }

      const extension = language === 'tsx' ? 'tsx' : 'ts'
      const stem = relative(contentRoot, path)
        .replaceAll('/', '-')
        .replace(/\.(?:md|mdx)$/u, '')
        .replaceAll(/[^a-zA-Z0-9-]/gu, '-')
      const target = join(temporary, `${stem}-${line}.${extension}`)
      snippets.push({ body: body.join('\n'), line, path, target })
    }
  }

  if (errors.length > 0) throw new Error(errors.join('\n'))
  if (snippets.length === 0)
    throw new Error('No compilable TypeScript documentation snippets found')

  await writeFile(join(temporary, 'globals.d.ts'), createApplicationDeclarations())
  for (const snippet of snippets) {
    const sourcePath = relative(root, snippet.path)
    await writeFile(
      snippet.target,
      `// Documentation source: ${sourcePath}:${snippet.line}\n${snippet.body}\n\nexport {}\n`,
    )
  }

  await writeFile(
    join(temporary, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          allowImportingTsExtensions: true,
          baseUrl: root,
          ignoreDeprecations: '6.0',
          jsx: 'react-jsx',
          lib: ['ES2022', 'DOM'],
          module: 'ESNext',
          moduleResolution: 'Bundler',
          noEmit: true,
          paths: {
            '@piparotech/subkit-core': ['packages/subkit-core/src/index.ts'],
            '@piparotech/subkit-expo': ['packages/subkit-expo/src/index.ts'],
            '@piparotech/subkit-expo/expo-iap': ['packages/subkit-expo/src/expoIapAdapter.ts'],
            '@piparotech/subkit-node': ['packages/subkit-node/src/index.ts'],
            '@react-native-async-storage/async-storage': [
              'packages/subkit-expo/node_modules/@react-native-async-storage/async-storage',
            ],
            'react-native': ['packages/subkit-expo/node_modules/react-native'],
            'react-native-mmkv': ['packages/subkit-expo/node_modules/react-native-mmkv'],
          },
          skipLibCheck: true,
          strict: true,
          types: ['node', 'react'],
        },
        include: ['./*.ts', './*.tsx'],
      },
      null,
      2,
    )}\n`,
  )

  execFileSync(
    'pnpm',
    [
      '--filter',
      '@piparotech/subkit-expo',
      'exec',
      'tsc',
      '--project',
      join(temporary, 'tsconfig.json'),
    ],
    { cwd: root, stdio: 'inherit' },
  )
  console.log(`Compiled ${snippets.length} TypeScript documentation snippets.`)
} finally {
  await rm(temporary, { force: true, recursive: true })
}

function createApplicationDeclarations() {
  return `type PlaceholderComponent = import('react').ComponentType<Record<string, unknown>>

declare global {
  type CustomerInfo = import('@piparotech/subkit-core').CustomerInfo
  type DeviceBlockedReason = import('@piparotech/subkit-core').DeviceBlockedReason
  type SubKitSerializableError = import('@piparotech/subkit-core').SubKitSerializableError
  type SubKitOfferingPackage = import('@piparotech/subkit-expo').SubKitOfferingPackage

  const AppNavigation: PlaceholderComponent
  const Badge: PlaceholderComponent
  const Button: PlaceholderComponent
  const HelperText: PlaceholderComponent
  const LoadingState: PlaceholderComponent
  const Navigation: PlaceholderComponent
  const OfflineNotice: PlaceholderComponent
  const ConfigurationError: PlaceholderComponent
  const DeviceRecovery: PlaceholderComponent
  const PackageList: PlaceholderComponent
  const PaidFeatures: PlaceholderComponent
  const Paywall: PlaceholderComponent
  const PaywallError: PlaceholderComponent
  const PaywallSkeleton: PlaceholderComponent
  const PaywallUnavailable: PlaceholderComponent
  const ProFeatureContent: PlaceholderComponent
  const PurchaseRow: PlaceholderComponent
  const ScreenSkeleton: PlaceholderComponent

  const PRO: string
  const __DEV__: boolean
  const cachedInfo: CustomerInfo
  const client: import('@piparotech/subkit-expo').SubKitIapClient
  const configureSubKit: typeof import('@piparotech/subkit-expo').configureSubKit
  const club: { id: string }
  const contract: { accessSourceId: string; poolIds: string[] }
  const entitlement: import('@piparotech/subkit-core').CustomerEntitlement
  const installationId: string
  const inviteToken: string
  const myJsonStorage: import('@piparotech/subkit-expo').SubKitJsonStorage
  const offerings: import('@piparotech/subkit-expo').SubKitOfferingsResponse
  const pkg: SubKitOfferingPackage
  const subject: { id: string }
  const subkit: import('@piparotech/subkit-node').SubKit
  const useSubKitAccess: typeof import('@piparotech/subkit-expo').useSubKitAccess
  const useSubKitHasAccess: typeof import('@piparotech/subkit-expo').useSubKitHasAccess
  const useSubKitOfferings: typeof import('@piparotech/subkit-expo').useSubKitOfferings
  const user: { id: string }
  const userEnteredCode: string

  function expect(value: unknown): { toBe(expected: unknown): void }
  function handleResult(value: unknown): void
  function hash(value: string): string
  function renderAccessState(access: import('@piparotech/subkit-expo').SubKitEntitlementAccess): void
  function reportPurchaseError(error: unknown): void
  function runPurchase(packageIdentifier: string, onPurchased: () => void): void
  function showLoginPrompt(): void
  function showDeviceRecovery(reason: DeviceBlockedReason): void
  function showNothingToRestore(): void
  function showPurchaseFailedMessage(): void
  function showPurchasePendingMessage(): void
  function showPurchaseUnavailableMessage(message: string): void
  function showRestorePrompt(): void
  function showRetryablePurchaseError(message: string): void
  function showSupportLink(): void
  function showVerifiedWithoutEntitlement(): void
  function unlockPaidAccess(): void
}

export {}
`
}
