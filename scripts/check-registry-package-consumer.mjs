import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const temporary = mkdtempSync(join(tmpdir(), 'subkit-registry-consumer-'))
const registry = process.env.SUBKIT_NPM_REGISTRY
const token = process.env.NODE_AUTH_TOKEN

if (registry !== 'https://git.piparo.tech/api/packages/piparo.tech/npm/') {
  throw new Error('SUBKIT_NPM_REGISTRY must be the piparo.tech Forgejo npm registry')
}
if (token == null || token.length === 0) {
  throw new Error('NODE_AUTH_TOKEN is required for the Forgejo registry consumer')
}

function version(packageDirectory) {
  return JSON.parse(readFileSync(join(root, packageDirectory, 'package.json'), 'utf8').version)
}

const versions = {
  core: version('packages/subkit-core'),
  expo: version('packages/subkit-expo'),
  node: version('packages/subkit-node'),
}

try {
  writeFileSync(
    join(temporary, '.npmrc'),
    `@piparotech:registry=${registry}\n//git.piparo.tech/api/packages/piparo.tech/npm/:_authToken=\${NODE_AUTH_TOKEN}\nalways-auth=true\n`,
    { mode: 0o600 },
  )
  writeFileSync(
    join(temporary, 'package.json'),
    `${JSON.stringify(
      {
        dependencies: {
          '@piparotech/subkit-core': versions.core,
          '@piparotech/subkit-expo': versions.expo,
          '@piparotech/subkit-node': versions.node,
          '@react-native-async-storage/async-storage': '3.1.1',
          'expo-iap': '4.3.1',
          'expo-secure-store': '15.0.8',
          react: '19.2.3',
          'react-native': '0.85.3',
          'react-native-mmkv': '4.1.2',
        },
        name: 'subkit-forgejo-registry-consumer',
        private: true,
        type: 'module',
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(
    join(temporary, 'consumer.mjs'),
    `import { customerInfoSchema } from '@piparotech/subkit-core'
import { SubKit } from '@piparotech/subkit-node'

if (typeof customerInfoSchema.parse !== 'function') throw new Error('core schema unavailable')
if (typeof SubKit !== 'function') throw new Error('node client unavailable')
for (const subpath of [
  '@piparotech/subkit-expo',
  '@piparotech/subkit-expo/expo-iap',
  '@piparotech/subkit-expo/expo-secure-store',
  '@piparotech/subkit-expo/mmkv',
  '@piparotech/subkit-expo/async-storage',
]) {
  if (!import.meta.resolve(subpath).startsWith('file:')) throw new Error('unresolved ' + subpath)
}
`,
  )

  execFileSync('pnpm', ['install', '--ignore-workspace', '--frozen-lockfile=false'], {
    cwd: temporary,
    env: process.env,
    stdio: 'inherit',
  })
  execFileSync('node', ['consumer.mjs'], { cwd: temporary, stdio: 'inherit' })
  for (const [name, expected] of [
    ['@piparotech/subkit-core', versions.core],
    ['@piparotech/subkit-node', versions.node],
    ['@piparotech/subkit-expo', versions.expo],
  ]) {
    const installed = JSON.parse(
      readFileSync(join(temporary, 'node_modules', ...name.split('/'), 'package.json'), 'utf8'),
    )
    if (installed.name !== name || installed.version !== expected) {
      throw new Error(`Unexpected installed package identity for ${name}`)
    }
  }
  console.log(
    `Verified Forgejo registry consumer for Core ${versions.core}, Node ${versions.node}, and Expo ${versions.expo}.`,
  )
} finally {
  rmSync(temporary, { force: true, recursive: true })
}
