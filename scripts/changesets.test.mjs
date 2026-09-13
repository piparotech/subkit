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
import { checkReleaseTag } from './check-changeset-release-tag.mjs'
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

test('tag workflow retains public trusted publishing and adds Changesets selection', () => {
  const workflow = readFileSync(join(root, '.github/workflows/release-packages.yml'), 'utf8')
  assert.match(workflow, /contents: read/)
  assert.match(workflow, /id-token: write/)
  assert.match(workflow, /fetch-depth: 0/)
  assert.match(workflow, /git merge-base --is-ancestor/)
  assert.match(workflow, /run: pnpm check/)
  assert.match(workflow, /env -u NODE_AUTH_TOKEN node scripts\/check-changeset-release-tag.mjs/)
  assert.match(workflow, /npm publish "\$archive" --access public/)
  assert.match(workflow, /env -u NODE_AUTH_TOKEN pnpm packages:verify:registry/)
  assert.doesNotMatch(workflow, /npm.pkg.github.com|packages: write|workflow_dispatch/)
})

for (const target of ['core', 'node', 'expo']) {
  test(`component tag ${target} requires an actual Changesets release and correct Core`, async (t) => {
    const dir = fixture(t)
    mkdirSync(join(dir, 'scripts'))
    writeFileSync(
      join(dir, 'scripts/resolve-package-release-tag.mjs'),
      readFileSync(join(root, 'scripts/resolve-package-release-tag.mjs')),
    )
    addChangeset(dir, `@piparotech/subkit-${target}`)
    commit(dir)
    const baseCommit = command(dir, 'git', ['rev-parse', 'HEAD']).trim()
    const releases = releasedPackages(await getPlan(dir))
    version(dir)
    putJson(join(dir, 'release-plan.json'), { baseCommit, releases })
    commit(dir)
    const release = releases.find(({ name }) => name === `@piparotech/subkit-${target}`)
    const result = await checkReleaseTag(dir, `subkit-${target}-v${release.newVersion}`)
    assert.deepEqual(result.selected, release)
    assert.deepEqual(
      result.required,
      target === 'core' ? [] : [{ name: '@piparotech/subkit-core', version: '0.1.10' }],
    )
    await assert.rejects(checkReleaseTag(dir, `subkit-${target}-v9.9.9`), /does not select/)
    const unchanged = target === 'node' ? 'expo' : 'node'
    const unchangedVersion = readJson(
      join(dir, `packages/subkit-${unchanged}/package.json`),
    ).version
    await assert.rejects(
      checkReleaseTag(dir, `subkit-${unchanged}-v${unchangedVersion}`),
      /does not select/,
    )
  })
}
