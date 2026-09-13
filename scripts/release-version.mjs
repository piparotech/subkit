import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { getPlan, releasedPackages } from './changeset-plan.mjs'

const root = resolve(import.meta.dirname, '..')
const run = (command, args) => execFileSync(command, args, { cwd: root, encoding: 'utf8' })
const plan = await getPlan(root)
const releases = releasedPackages(plan)
if (!releases.length) {
  console.log('No release-relevant changesets; no files changed.')
} else {
  if (run('git', ['status', '--porcelain']).trim()) {
    throw new Error('Commit the reviewed changesets and implementation before preparing a release.')
  }
  if (existsSync(resolve(root, '.changeset/pre.json')))
    throw new Error('Prereleases require a separate release contract.')
  const baseCommit = run('git', ['rev-parse', 'HEAD']).trim()
  run('pnpm', ['exec', 'changeset', 'version'])
  run('pnpm', ['install', '--lockfile-only', '--ignore-scripts'])
  writeFileSync(
    resolve(root, 'release-plan.json'),
    JSON.stringify({ baseCommit, releases }, null, 2) + '\n',
  )
  run('pnpm', ['exec', 'prettier', '--write', 'release-plan.json'])
  console.log(
    'Review the versions, changelogs, lockfile and release-plan.json; commit together in one release commit. Nothing published or tagged.',
  )
}
