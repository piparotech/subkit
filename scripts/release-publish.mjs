import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { packageDirectories, selectRelease } from './release-selection.mjs'

const registry = 'https://npm.pkg.github.com/'

export function inspectVersion(name, version, execute) {
  const result = execute('npm', [
    'view',
    `${name}@${version}`,
    'version',
    'dist.integrity',
    '--json',
    `--registry=${registry}`,
  ])
  let data
  try {
    data = JSON.parse(result.stdout)
  } catch {
    throw new Error(`Unparseable registry response for ${name}@${version}`)
  }
  if (result.status !== 0) {
    if (data.error?.code === 'E404') return null
    throw new Error(`Cannot verify registry version for ${name}@${version}; refusing mutation.`)
  }
  if (
    data.version !== version ||
    typeof data['dist.integrity'] !== 'string' ||
    !data['dist.integrity']
  ) {
    throw new Error(`Unexpected registry metadata for ${name}@${version}`)
  }
  return data
}

export async function publishSelected(releases, { inspect, pack, publish, verify }) {
  // Complete preflight before the first mutation, including later packages.
  for (const release of releases) {
    if (await inspect(release))
      throw new Error(`${release.name}@${release.newVersion} already exists; do not republish.`)
  }
  const artifacts = []
  for (const release of releases) artifacts.push(await pack(release))
  for (let index = 0; index < releases.length; index++) {
    // Never automatically retry an ambiguous failure. The operator must inspect all targets.
    await publish(releases[index], artifacts[index])
    await verify(releases[index])
  }
}

export async function main(root) {
  const mode = process.argv[2]
  if (!['publish', 'verify'].includes(mode)) throw new Error('Expected publish or verify mode.')
  const tag = process.env.DIST_TAG
  if (
    !tag ||
    !/^[a-z][a-z0-9._-]*$/.test(tag) ||
    /^v?[0-9]+(?:\.[0-9]+){0,2}(?:[-+].*)?$/.test(tag)
  ) {
    throw new Error('Invalid distribution tag.')
  }
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  if (process.env.GITHUB_REF !== 'refs/heads/main' || process.env.GITHUB_SHA !== sha) {
    throw new Error('Publication requires the trusted main workflow and exact checkout SHA.')
  }
  const releases = await selectRelease(root)
  const execute = (command, args) =>
    spawnSync(command, args, { cwd: root, encoding: 'utf8', env: process.env })
  const inspect = ({ name, newVersion }) => inspectVersion(name, newVersion, execute)
  const verify = async (release) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      if (inspect(release)) return
      if (attempt < 4) await new Promise((done) => setTimeout(done, 2000))
    }
    throw new Error(`Published version not visible: ${release.name}`)
  }
  const verifyAll = async () => {
    for (const [name, directory] of Object.entries(packageDirectories)) {
      const manifest = JSON.parse(readFileSync(join(root, directory, 'package.json'), 'utf8'))
      await verify({ name, newVersion: manifest.version })
    }
  }
  if (mode === 'verify') {
    await verifyAll()
    return
  }
  const output = join(root, '.release')
  mkdirSync(output, { recursive: true })
  try {
    await publishSelected(releases, {
      inspect,
      pack: async (release) => {
        const folder = join(output, release.name.split('/')[1])
        mkdirSync(folder)
        execFileSync('pnpm', ['pack', '--pack-destination', folder], {
          cwd: join(root, packageDirectories[release.name]),
          stdio: 'inherit',
        })
        const files = readdirSync(folder)
        if (files.length !== 1 || !files[0].endsWith('.tgz'))
          throw new Error('Unexpected packed artifact set.')
        return join(folder, files[0])
      },
      publish: async (_release, artifact) => {
        execFileSync('npm', ['publish', artifact, `--registry=${registry}`, '--tag', tag], {
          cwd: root,
          stdio: 'inherit',
        })
      },
      verify,
    })
    await verifyAll()
  } finally {
    rmSync(output, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main(resolve(import.meta.dirname, '..'))
}
