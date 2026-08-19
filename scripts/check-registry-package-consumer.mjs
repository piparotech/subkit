import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { readPackageVersion } from './package-manifest-version.mjs'

const root = resolve(import.meta.dirname, '..')
const temporary = mkdtempSync(join(tmpdir(), 'subkit-registry-consumer-'))
const registry = process.env.SUBKIT_NPM_REGISTRY
const releasePackage = process.env.SUBKIT_RELEASE_PACKAGE

if (registry !== 'https://registry.npmjs.org/') {
  throw new Error('SUBKIT_NPM_REGISTRY must be the public npm registry')
}
if (!['core', 'node', 'expo'].includes(releasePackage)) {
  throw new Error('SUBKIT_RELEASE_PACKAGE must be core, node, or expo')
}
if (process.env.NODE_AUTH_TOKEN != null) {
  throw new Error('Public npm registry verification must not receive NODE_AUTH_TOKEN')
}

const versions = {
  core: readPackageVersion(root, 'packages/subkit-core'),
  expo: readPackageVersion(root, 'packages/subkit-expo'),
  node: readPackageVersion(root, 'packages/subkit-node'),
}

const dependencies = {
  '@piparotech/subkit-core': versions.core,
}
const imports = [
  `import { customerInfoSchema } from '@piparotech/subkit-core'`,
  `if (typeof customerInfoSchema.parse !== 'function') throw new Error('core schema unavailable')`,
]

if (releasePackage === 'node') {
  dependencies['@piparotech/subkit-node'] = versions.node
  imports.push(
    `import { SubKit } from '@piparotech/subkit-node'`,
    `if (typeof SubKit !== 'function') throw new Error('node client unavailable')`,
  )
}
if (releasePackage === 'expo') {
  Object.assign(dependencies, {
    '@piparotech/subkit-expo': versions.expo,
    '@react-native-async-storage/async-storage': '3.1.1',
    'expo-iap': '4.3.1',
    'expo-secure-store': '15.0.8',
    react: '19.2.3',
    'react-native': '0.85.3',
    'react-native-mmkv': '4.1.2',
  })
  imports.push(`for (const subpath of [
  '@piparotech/subkit-expo',
  '@piparotech/subkit-expo/expo-iap',
  '@piparotech/subkit-expo/expo-secure-store',
  '@piparotech/subkit-expo/mmkv',
  '@piparotech/subkit-expo/async-storage',
]) {
  if (!import.meta.resolve(subpath).startsWith('file:')) throw new Error('unresolved ' + subpath)
}`)
}

try {
  const userConfiguration = join(temporary, 'npmrc')
  writeFileSync(
    userConfiguration,
    `registry=${registry}\n@piparotech:registry=${registry}\nalways-auth=false\n`,
    { mode: 0o600 },
  )
  writeFileSync(
    join(temporary, 'package.json'),
    `${JSON.stringify(
      {
        dependencies,
        name: `subkit-${releasePackage}-public-registry-consumer`,
        private: true,
        type: 'module',
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(join(temporary, 'consumer.mjs'), `${imports.join('\n')}\n`)

  const environment = {
    ...process.env,
    HOME: temporary,
    NPM_CONFIG_GLOBALCONFIG: join(temporary, 'global-npmrc'),
    NPM_CONFIG_USERCONFIG: userConfiguration,
  }
  delete environment.NODE_AUTH_TOKEN
  delete environment.npm_config_userconfig
  execFileSync('pnpm', ['install', '--ignore-workspace', '--frozen-lockfile=false'], {
    cwd: temporary,
    env: environment,
    stdio: 'inherit',
  })
  execFileSync('node', ['consumer.mjs'], { cwd: temporary, env: environment, stdio: 'inherit' })

  const expectedPackages = [['@piparotech/subkit-core', versions.core]]
  if (releasePackage === 'node') {
    expectedPackages.push(['@piparotech/subkit-node', versions.node])
  }
  if (releasePackage === 'expo') {
    expectedPackages.push(['@piparotech/subkit-expo', versions.expo])
  }
  for (const [name, expected] of expectedPackages) {
    const installed = JSON.parse(
      readFileSync(join(temporary, 'node_modules', ...name.split('/'), 'package.json'), 'utf8'),
    )
    if (installed.name !== name || installed.version !== expected) {
      throw new Error(`Unexpected installed package identity for ${name}`)
    }
  }
  console.log(`Verified anonymous npm consumer for ${releasePackage}.`)
} finally {
  rmSync(temporary, { force: true, recursive: true })
}
