import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { packageDirectories, selectRelease } from './release-selection.mjs'

export async function checkReleaseTag(root, tag) {
  const releases = await selectRelease(root)
  const selected = releases.find(
    ({ name, newVersion }) => `${name.split('/')[1]}-v${newVersion}` === tag,
  )
  if (!selected)
    throw new Error('Tag does not select a versioned package in the Changesets release plan.')
  // The normal tag resolver separately enforces syntax, exact manifest identity
  // and public registry policy. Do not infer a release from registry absence.
  execFileSync(process.execPath, [join(root, 'scripts/resolve-package-release-tag.mjs'), tag], {
    cwd: root,
    stdio: 'pipe',
  })
  const required = []
  if (selected.name !== '@piparotech/subkit-core') {
    const core = JSON.parse(
      readFileSync(
        join(root, packageDirectories['@piparotech/subkit-core'], 'package.json'),
        'utf8',
      ),
    )
    required.push({ name: core.name, version: core.version })
  }
  return { selected, required }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(import.meta.dirname, '..')
  const { selected, required } = await checkReleaseTag(root, process.argv[2])
  for (const { name, version } of required) {
    execFileSync(
      process.execPath,
      [join(root, 'scripts/check-public-package-version.mjs'), name, version, 'present'],
      { cwd: root, stdio: 'inherit' },
    )
  }
  console.log(
    `Changesets authorizes ${selected.name}@${selected.newVersion}; required Core metadata verified.`,
  )
}
