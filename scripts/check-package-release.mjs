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

function writeConsumer(name, dependencies, source, types) {
  const directory = join(temporary, name)
  run('mkdir', ['-p', directory])
  writeFileSync(
    join(directory, 'package.json'),
    `${JSON.stringify({ dependencies, name, private: true, type: 'module' }, null, 2)}\n`,
  )
  writeFileSync(join(directory, 'consumer.mjs'), source)
  run('pnpm', ['install', '--ignore-workspace', '--no-frozen-lockfile'], directory)
  run('node', ['consumer.mjs'], directory)
  if (types != null) {
    writeFileSync(join(directory, 'consumer.ts'), types)
    run(
      'node',
      [
        join(root, 'node_modules/typescript/bin/tsc'),
        '--noEmit',
        '--strict',
        '--module',
        'NodeNext',
        '--moduleResolution',
        'NodeNext',
        '--target',
        'ES2022',
        '--skipLibCheck',
        'consumer.ts',
      ],
      directory,
    )
  }
}

try {
  run('mkdir', ['-p', packDirectory])

  for (const directory of packageDirectories) {
    const packageJson = readPackageJson(directory)
    if (packageJson.private === true) throw new Error(`${packageJson.name} is still private`)
    if (packageJson.publishConfig?.registry !== 'https://registry.npmjs.org/') {
      throw new Error(`${packageJson.name} has an unexpected publish registry`)
    }
    if (packageJson.publishConfig?.access !== 'public') {
      throw new Error(`${packageJson.name} must publish with public access`)
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
    `import { customerInfoSchema, resolveEntitlementAccess, invitationCodeFormatSchema, serverInvitationIssueRequestSchema, serverOrganizationPoolListResponseSchema } from '@piparotech/subkit-core'
if (typeof customerInfoSchema.parse !== 'function') throw new Error('core schema unavailable')
if (typeof resolveEntitlementAccess !== 'function') throw new Error('effective access resolver unavailable')
invitationCodeFormatSchema.parse({ prefix: 'CLUB-', randomLength: 8, alphabet: 'unambiguous-uppercase', groupSize: 4 })
if (serverInvitationIssueRequestSchema.safeParse({ appId: 'app', poolId: 'pool', reason: 'Invite' }).success) throw new Error('invitation recipient binding missing')
if (typeof serverOrganizationPoolListResponseSchema.parse !== 'function') throw new Error('organization pool contract unavailable')
`,
  )

  writeConsumer(
    'node-consumer',
    {
      '@piparotech/subkit-core': `file:${core.path}`,
      '@piparotech/subkit-node': `file:${node.path}`,
    },
    `import { SubKit } from '@piparotech/subkit-node'
if (typeof SubKit !== 'function') throw new Error('node client unavailable')
let called = false
const client = new SubKit({
  appId: 'app', secretKey: 'sk_srv_fixture', apiBaseUrl: 'https://example.invalid',
  fetch: async (url, init) => {
    const body = JSON.parse(init.body)
    if (!url.endsWith('/access-invitations') || body.appId !== 'app' || body.recipient.subjectId !== 'subject') throw new Error('invitation transport mismatch')
    called = true
    return Response.json({ appId: 'app', poolId: 'pool', reservationId: 'reservation', accessSourceId: 'source', environment: 'sandbox', codeVersion: 1, quantity: 1, formatRevision: 1, code: 'CLUB-23AB CDEF', format: { prefix: 'CLUB-', randomLength: 8, alphabet: 'unambiguous-uppercase', groupSize: 4 }, expiresAt: '2027-01-01T00:00:00.000Z' })
  },
})
const invitation = await client.invitations.issue({ poolId: 'pool', recipient: { kind: 'subject', subjectId: 'subject' }, reason: 'Invite' }, { idempotencyKey: 'consumer-invitation' })
if (!called || invitation.reservationId !== 'reservation') throw new Error('invitation consumer unavailable')
`,
    `import type { InvitationRecipient, ServerInvitationFormatResponse } from '@piparotech/subkit-core'
import { SubKit, type IssueInvitationInput, type ServerInvitationDeliveryResponse, type ServerOrganizationInvitationListResponse, type ServerOrganizationPoolListResponse } from '@piparotech/subkit-node'
const recipient: InvitationRecipient = { kind: 'subject', subjectId: 'subject' }
const input: IssueInvitationInput = { poolId: 'pool', recipient, reason: 'Invite' }
const client = new SubKit({ appId: 'app', secretKey: 'sk_srv_fixture', apiBaseUrl: 'https://example.invalid' })
async function check() {
  const delivery: ServerInvitationDeliveryResponse = await client.invitations.issue(input, { idempotencyKey: 'consumer-invitation' })
  const quantity: number = delivery.quantity
  const formatRevision: number = delivery.formatRevision
  const current: ServerInvitationFormatResponse = await client.invitations.getFormat()
  const pools: ServerOrganizationPoolListResponse = await client.access.listOrganizationPools({ organizationSubjectId: 'club' })
  const invitations: ServerOrganizationInvitationListResponse = await client.invitations.listForOrganization({ organizationSubjectId: 'club', limit: 100 })
  const next: string | null = pools.nextCursor
  const display = invitations.items[0]?.recipientDisplay?.email
  return [delivery.code, current.format?.prefix, quantity, formatRevision, next, display]
}
// @ts-expect-error Managed codes always require recipient binding.
const unbound: IssueInvitationInput = { poolId: 'pool', reason: 'Invite' }
// @ts-expect-error Mutations require the original operation key.
client.invitations.issue(input)
export { check, unbound }
`,
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
