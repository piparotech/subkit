import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const temporary = mkdtempSync(join(tmpdir(), 'subkit-package-release-'))
const packDirectory = join(temporary, 'packs')

const packageDirectories = ['packages/subkit-core', 'packages/subkit-node', 'packages/subkit-expo']

function readPackageJson(directory) {
  return JSON.parse(readFileSync(join(root, directory, 'package.json'), 'utf8'))
}

function run(command, args, cwd = root) {
  execFileSync(command, args, { cwd, stdio: 'inherit' })
}

function exportTargets(exports) {
  const targets = []
  const visit = (value) => {
    if (typeof value === 'string') {
      targets.push(value)
      return
    }
    if (value == null || typeof value !== 'object') return
    for (const nested of Object.values(value)) visit(nested)
  }
  visit(exports)
  return targets
}

function pack(directory) {
  const packageJson = readPackageJson(directory)
  run('pnpm', ['--filter', packageJson.name, 'pack', '--pack-destination', packDirectory])
  const filename = `${packageJson.name.slice(1).replace('/', '-')}-${packageJson.version}.tgz`
  const path = join(packDirectory, filename)
  if (!existsSync(path)) throw new Error(`Expected package tarball ${path}`)

  const archiveEntries = new Set(
    execFileSync('tar', ['-tzf', path], { encoding: 'utf8' }).trim().split('\n'),
  )
  for (const target of exportTargets(packageJson.exports)) {
    const archivePath = `package/${target.replace(/^\.\//u, '')}`
    if (!archiveEntries.has(archivePath)) {
      throw new Error(`${packageJson.name} export target is absent from tarball: ${target}`)
    }
  }
  return { packageJson, path }
}

function requireTarballDeclaration(path, declarationPath, names) {
  const declaration = execFileSync('tar', ['-xOzf', path, `package/${declarationPath}`], {
    encoding: 'utf8',
  })
  for (const name of names) {
    if (!declaration.includes(name)) {
      throw new Error(`${basename(path)} is missing declaration ${name} in ${declarationPath}`)
    }
  }
}

function writeConsumer(name, dependencies, source) {
  const directory = join(temporary, name)
  run('mkdir', ['-p', directory])
  writeFileSync(
    join(directory, 'package.json'),
    `${JSON.stringify({ dependencies, name, private: true, type: 'module' }, null, 2)}\n`,
  )
  writeFileSync(join(directory, 'consumer.mjs'), source)
  run('pnpm', ['install', '--ignore-workspace', '--frozen-lockfile=false'], directory)
  run('node', ['consumer.mjs'], directory)
}

try {
  run('mkdir', ['-p', packDirectory])

  for (const directory of packageDirectories) {
    const packageJson = readPackageJson(directory)
    if (packageJson.private === true) throw new Error(`${packageJson.name} is still private`)
    if (packageJson.publishConfig?.registry !== 'https://npm.pkg.github.com/') {
      throw new Error(`${packageJson.name} has an unexpected publish registry`)
    }
    if (packageJson.repository?.url !== 'git+https://github.com/piparotech/subkit.git') {
      throw new Error(`${packageJson.name} has an unexpected source repository`)
    }
    if (packageJson.repository?.directory !== directory) {
      throw new Error(`${packageJson.name} has an unexpected repository directory`)
    }
  }

  run('pnpm', ['--filter', '@piparotech/subkit-core', 'build'])
  run('pnpm', ['--filter', '@piparotech/subkit-node', 'build'])
  run('pnpm', ['--filter', '@piparotech/subkit-expo', 'build'])

  const packed = Object.fromEntries(
    packageDirectories.map((directory) => {
      const result = pack(directory)
      return [result.packageJson.name, result]
    }),
  )

  const core = packed['@piparotech/subkit-core']
  const node = packed['@piparotech/subkit-node']
  const expo = packed['@piparotech/subkit-expo']
  if (core == null || node == null || expo == null) throw new Error('Missing packed package')

  writeConsumer(
    'core-consumer',
    { '@piparotech/subkit-core': `file:${core.path}` },
    `import { customerInfoSchema, resolveEntitlementAccess } from '@piparotech/subkit-core'\nif (typeof customerInfoSchema.parse !== 'function') throw new Error('core schema unavailable')\nif (typeof resolveEntitlementAccess !== 'function') throw new Error('effective access resolver unavailable')\n`,
  )

  writeConsumer(
    'node-consumer',
    {
      '@piparotech/subkit-core': `file:${core.path}`,
      '@piparotech/subkit-node': `file:${node.path}`,
    },
    `import { SubKit } from '@piparotech/subkit-node'\nif (typeof SubKit !== 'function') throw new Error('node client unavailable')\n`,
  )

  requireTarballDeclaration(expo.path, 'dist/index.d.ts', [
    'getSubKitAccessSnapshot',
    'resolveSubKitEntitlementAccess',
    'useSubKitAccess',
    'useSubKitHasAccess',
  ])
  requireTarballDeclaration(expo.path, 'dist/SubKitIapClient.d.ts', ['getAccess(', 'hasAccess('])

  writeConsumer(
    'expo-consumer',
    {
      '@piparotech/subkit-core': `file:${core.path}`,
      '@piparotech/subkit-expo': `file:${expo.path}`,
      '@react-native-async-storage/async-storage': '3.1.1',
      'expo-iap': '4.3.1',
      'expo-secure-store': '15.0.8',
      react: '19.2.3',
      'react-native': '0.85.3',
      'react-native-mmkv': '4.1.2',
    },
    `for (const subpath of [
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

  console.log(
    `Verified clean consumers for ${[core, node, expo]
      .map(({ path }) => basename(path))
      .join(', ')}`,
  )
} finally {
  rmSync(temporary, { force: true, recursive: true })
}
