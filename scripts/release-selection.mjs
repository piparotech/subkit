import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'

import { getPlan, releasedPackages } from './changeset-plan.mjs'

export const packageDirectories = {
  '@piparotech/subkit-core': 'packages/subkit-core',
  '@piparotech/subkit-node': 'packages/subkit-node',
  '@piparotech/subkit-expo': 'packages/subkit-expo',
}

// A release is exactly one non-merge commit after the recorded source commit.
// Recompute its package selection from that source's changesets, never from 404s.
export async function selectRelease(root) {
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  if (git(['status', '--porcelain', '--untracked-files=no']))
    throw new Error('Release checkout has tracked changes.')
  const record = JSON.parse(readFileSync(join(root, 'release-plan.json'), 'utf8'))
  const parents = git(['show', '-s', '--format=%P', 'HEAD']).split(' ')
  if (parents.length !== 1 || record.baseCommit !== parents[0]) {
    throw new Error('Release must be one commit directly after release-plan.json baseCommit.')
  }
  const temp = mkdtempSync(join(tmpdir(), 'subkit-release-source-'))
  try {
    const files = git(['ls-tree', '-r', '--name-only', record.baseCommit])
      .split('\n')
      .filter(
        (file) =>
          ['package.json', 'pnpm-workspace.yaml'].includes(file) ||
          /^packages\/[^/]+\/package\.json$/.test(file) ||
          /^apps\/[^/]+\/package\.json$/.test(file) ||
          /^\.changeset\/[^/]+\.(json|md)$/.test(file),
      )
    for (const file of files) {
      mkdirSync(dirname(join(temp, file)), { recursive: true })
      writeFileSync(
        join(temp, file),
        execFileSync('git', ['show', `${record.baseCommit}:${file}`], { cwd: root }),
      )
    }
    symlinkSync(join(root, 'node_modules'), join(temp, 'node_modules'))
    const sourcePlan = await getPlan(temp)
    const expected = releasedPackages(sourcePlan)
    if (!expected.length || !isDeepStrictEqual(record.releases, expected)) {
      throw new Error('Release selection does not match the source changesets.')
    }
    const remaining = await getPlan(root)
    if (remaining.changesets.length) throw new Error('Release contains unconsumed changesets.')
    for (const [name, directory] of Object.entries(packageDirectories)) {
      const before = JSON.parse(readFileSync(join(temp, directory, 'package.json'), 'utf8'))
      const after = JSON.parse(readFileSync(join(root, directory, 'package.json'), 'utf8'))
      const release = expected.find((item) => item.name === name)
      if (
        after.version !== (release?.newVersion ?? before.version) ||
        after.name !== name ||
        after.private === true
      ) {
        throw new Error(`Unexpected release identity for ${name}`)
      }
      if (
        !isDeepStrictEqual(after.publishConfig, before.publishConfig) ||
        after.publishConfig.registry !== 'https://registry.npmjs.org/' ||
        after.publishConfig.access !== 'public'
      ) {
        throw new Error(`Registry/access changed for ${name}`)
      }
      // All internal ranges use workspace shorthand. Versioning must not alter
      // code, exports, scripts or registry configuration in a release commit.
      if (
        !isDeepStrictEqual(after, { ...before, version: release?.newVersion ?? before.version })
      ) {
        throw new Error(`Unexpected non-version manifest change for ${name}`)
      }
      if (release) {
        const changelog = readFileSync(join(root, directory, 'CHANGELOG.md'), 'utf8')
        if (!changelog.includes(`## ${release.newVersion}\n`))
          throw new Error(`Missing changelog for ${name}`)
      }
    }
    const allowed = new Set([
      'release-plan.json',
      'pnpm-lock.yaml',
      ...Object.values(packageDirectories).flatMap((directory) => [
        `${directory}/package.json`,
        `${directory}/CHANGELOG.md`,
      ]),
      ...sourcePlan.changesets.map(({ id }) => `.changeset/${id}.md`),
    ])
    const changed = git(['diff', '--name-only', record.baseCommit, 'HEAD']).split('\n')
    if (changed.some((file) => !allowed.has(file)))
      throw new Error('Release commit contains non-release changes.')
    return expected
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}
