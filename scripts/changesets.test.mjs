import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { getPlan, releasedPackages } from './changeset-plan.mjs'
import {
  addChangeset,
  command,
  commit,
  fixture,
  names,
  noChangesetVersion,
  putJson,
  readJson,
  root,
  version,
} from './changesets-fixture.mjs'
import { inspectVersion, publishSelected } from './release-publish.mjs'
import { selectRelease } from './release-selection.mjs'

for (const [target, bump, expected] of [
  ['node', 'patch', ['0.1.10', '0.1.11', '0.1.12']],
  ['expo', 'patch', ['0.1.10', '0.1.10', '0.1.13']],
  ['core', 'patch', ['0.1.11', '0.1.10', '0.1.12']],
  ['core', 'minor', ['0.2.0', '0.1.11', '0.1.13']],
]) {
  test(`${target} ${bump}: real version, history, pack, selection and no-op`, async (t) => {
    const dir = fixture(t)
    addChangeset(dir, `@piparotech/subkit-${target}`, bump)
    commit(dir)
    const baseCommit = command(dir, 'git', ['rev-parse', 'HEAD']).trim()
    const releases = releasedPackages(await getPlan(dir))
    version(dir)
    putJson(join(dir, 'release-plan.json'), { baseCommit, releases })
    commit(dir)
    assert.deepEqual(await selectRelease(dir), releases)
    mkdirSync(join(dir, 'packed'))
    for (const [index, name] of names.entries()) {
      const path = `packages/subkit-${name}`
      const manifest = readJson(join(dir, path, 'package.json'))
      assert.equal(manifest.version, expected[index])
      const oldHistory = readFileSync(join(root, path, 'CHANGELOG.md'), 'utf8')
        .split('\n')
        .slice(2)
        .join('\n')
      assert.ok(readFileSync(join(dir, path, 'CHANGELOG.md'), 'utf8').endsWith(oldHistory))
      command(join(dir, path), 'pnpm', ['pack', '--pack-destination', join(dir, 'packed')])
      const packed = JSON.parse(
        command(dir, 'tar', [
          '-xOf',
          join(dir, `packed/piparotech-subkit-${name}-${manifest.version}.tgz`),
          'package/package.json',
        ]),
      )
      assert.equal(packed.version, manifest.version)
      assert.deepEqual(packed.publishConfig, manifest.publishConfig)
      if (name !== 'core')
        assert.equal(packed.peerDependencies['@piparotech/subkit-core'], `^${expected[0]}`)
    }
    assert.equal(readJson(join(dir, 'apps/docs/package.json')).version, '0.0.0')
    const second = noChangesetVersion(dir)
    assert.equal(second.status, 1)
    assert.match(second.stdout + second.stderr, /No unreleased changesets found/)
    assert.equal(command(dir, 'git', ['status', '--porcelain']).trim(), '')
    const record = readJson(join(dir, 'release-plan.json'))
    record.releases = []
    putJson(join(dir, 'release-plan.json'), record)
    await assert.rejects(selectRelease(dir), /tracked changes/)
  })
}

test('validator permits docs-only no-op and rejects invalid/private packages and bump types', async (t) => {
  const dir = fixture(t)
  writeFileSync(join(dir, 'README.md'), 'Documentation-only update\n')
  assert.deepEqual(releasedPackages(await getPlan(dir)), [])
  for (const [name, type] of [
    ['missing', 'patch'],
    ['@piparotech/subkit-docs', 'patch'],
    ['@piparotech/subkit-core', 'banana'],
  ]) {
    addChangeset(dir, name, type)
    await assert.rejects(getPlan(dir))
  }
})

test('selection refuses wrong source commit, missing release and unconsumed changesets', async (t) => {
  const dir = fixture(t)
  await assert.rejects(selectRelease(dir))
  putJson(join(dir, 'release-plan.json'), { baseCommit: 'bad', releases: [] })
  commit(dir)
  await assert.rejects(selectRelease(dir), /directly after/)
})

test('registry requires parsed exact identity/integrity and only accepts structured E404 as absent', () => {
  const inspect = (status, data) =>
    inspectVersion('sdk', '1.0.0', () => ({ status, stdout: JSON.stringify(data) }))
  assert.equal(inspect(1, { error: { code: 'E404' } }), null)
  assert.ok(inspect(0, { version: '1.0.0', 'dist.integrity': 'sha512-valid' }))
  for (const code of ['E401', 'E403', 'E500', 'ETIMEDOUT'])
    assert.throws(() => inspect(1, { error: { code } }))
  assert.throws(() => inspect(0, { version: 'other', 'dist.integrity': 'sha512-valid' }))
  assert.throws(() =>
    inspectVersion('sdk', '1.0.0', () => ({ status: 1, stdout: '404 gateway failure' })),
  )
})

test('publisher preflights all versions, preserves order, publishes only selection, and never retries', async () => {
  const releases = [
    { name: 'core', newVersion: '1' },
    { name: 'node', newVersion: '2' },
  ]
  const calls = []
  const actions = {
    inspect: async (r) => {
      calls.push(`inspect:${r.name}`)
      return null
    },
    pack: async (r) => {
      calls.push(`pack:${r.name}`)
      return r.name
    },
    publish: async (r) => {
      calls.push(`publish:${r.name}`)
    },
    verify: async (r) => {
      calls.push(`verify:${r.name}`)
    },
  }
  await publishSelected([releases[1]], actions)
  assert.deepEqual(calls, ['inspect:node', 'pack:node', 'publish:node', 'verify:node'])
  calls.length = 0
  await publishSelected([], actions)
  assert.deepEqual(calls, [])
  await assert.rejects(
    publishSelected(releases, {
      ...actions,
      inspect: async (r) => (r.name === 'node' ? {} : null),
    }),
    /already exists/,
  )
  assert.deepEqual(calls, [])
  await assert.rejects(
    publishSelected(releases, {
      ...actions,
      publish: async (r) => {
        calls.push(`attempt:${r.name}`)
        throw new Error('ambiguous transport')
      },
    }),
    /ambiguous/,
  )
  assert.deepEqual(calls, [
    'inspect:core',
    'inspect:node',
    'pack:core',
    'pack:node',
    'attempt:core',
  ])
})

for (const problem of ['selection', 'manifest', 'unconsumed', 'source-file']) {
  test(`committed ${problem} tampering is rejected`, async (t) => {
    const dir = fixture(t)
    addChangeset(dir, '@piparotech/subkit-node')
    commit(dir)
    const baseCommit = command(dir, 'git', ['rev-parse', 'HEAD']).trim()
    const releases = releasedPackages(await getPlan(dir))
    version(dir)
    putJson(join(dir, 'release-plan.json'), {
      baseCommit,
      releases: problem === 'selection' ? [] : releases,
    })
    if (problem === 'manifest') {
      const file = join(dir, 'packages/subkit-node/package.json')
      const manifest = readJson(file)
      manifest.scripts.prepublishOnly = 'unexpected'
      putJson(file, manifest)
    }
    if (problem === 'unconsumed') addChangeset(dir, '@piparotech/subkit-expo')
    if (problem === 'source-file') writeFileSync(join(dir, 'unexpected.mjs'), 'export default 1')
    commit(dir)
    await assert.rejects(selectRelease(dir), /selection|manifest|unconsumed|non-release/)
  })
}

test('partial publication stops after failure; later recovery refuses already-published core', async () => {
  const releases = [
    { name: 'core', newVersion: '1' },
    { name: 'node', newVersion: '1' },
  ]
  const published = new Set()
  const attempts = []
  const actions = {
    inspect: async (r) => (published.has(r.name) ? {} : null),
    pack: async (r) => r.name,
    publish: async (r) => {
      attempts.push(r.name)
      if (r.name === 'node') throw new Error('transport failure')
      published.add(r.name)
    },
    verify: async () => {},
  }
  await assert.rejects(publishSelected(releases, actions), /transport/)
  assert.deepEqual(attempts, ['core', 'node'])
  await assert.rejects(publishSelected(releases, actions), /already exists/)
  assert.deepEqual(attempts, ['core', 'node'])
})

test('actual release wrapper refreshes lockfile, emits source record and repeats without a diff', async (t) => {
  const dir = fixture(t)
  mkdirSync(join(dir, 'scripts'))
  for (const file of ['release-version.mjs', 'changeset-plan.mjs']) {
    writeFileSync(join(dir, 'scripts', file), readFileSync(join(root, 'scripts', file)))
  }
  writeFileSync(join(dir, 'pnpm-lock.yaml'), readFileSync(join(root, 'pnpm-lock.yaml')))
  addChangeset(dir, '@piparotech/subkit-node')
  commit(dir)
  command(dir, process.execPath, ['scripts/release-version.mjs'])
  const record = readJson(join(dir, 'release-plan.json'))
  assert.deepEqual(
    record.releases.map(({ name }) => name),
    ['@piparotech/subkit-node'],
  )
  command(dir, 'pnpm', ['install', '--lockfile-only', '--frozen-lockfile', '--ignore-scripts'])
  commit(dir)
  assert.deepEqual(await selectRelease(dir), record.releases)
  command(dir, process.execPath, ['scripts/release-version.mjs'])
  assert.equal(command(dir, 'git', ['status', '--porcelain']).trim(), '')
})

test('workflow retains exact-SHA guards, full gates, read-only recovery and all-package consumers', () => {
  const workflow = readFileSync(join(root, '.github/workflows/release-packages.yml'), 'utf8')
  assert.match(workflow, /contents: read/)
  assert.match(workflow, /packages: write/)
  assert.match(workflow, /fetch-depth: 0/)
  assert.match(workflow, /test "\$GITHUB_REF" = refs\/heads\/main/)
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$GITHUB_SHA"/)
  assert.match(workflow, /run: pnpm check/)
  assert.match(
    workflow,
    /if: \$\{\{ inputs.verify_existing != true \}\}[\s\S]*?run: node scripts\/release-publish.mjs publish/,
  )
  assert.match(
    workflow,
    /if: \$\{\{ inputs.verify_existing == true \}\}[\s\S]*?run: node scripts\/release-publish.mjs verify/,
  )
  assert.match(workflow, /run: pnpm packages:verify:registry/)
  assert.match(workflow, /if: \$\{\{ always\(\) \}\}/)
})
