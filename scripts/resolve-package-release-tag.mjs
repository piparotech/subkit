#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const tag = process.argv[2]

if (tag == null || tag.length === 0) {
  throw new Error('Release tag is required')
}

const releases = [
  { slug: 'core', prefix: 'subkit-core-v', directory: 'packages/subkit-core' },
  { slug: 'node', prefix: 'subkit-node-v', directory: 'packages/subkit-node' },
  { slug: 'expo', prefix: 'subkit-expo-v', directory: 'packages/subkit-expo' },
]

const release = releases.find(({ prefix }) => tag.startsWith(prefix))
if (release == null) {
  throw new Error(`Unsupported release tag: ${tag}`)
}

const tagVersion = tag.slice(release.prefix.length)
if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/u.test(tagVersion)) {
  throw new Error(`Release tag has an invalid semantic version: ${tag}`)
}

const manifest = JSON.parse(readFileSync(resolve(root, release.directory, 'package.json'), 'utf8'))
if (manifest.version !== tagVersion) {
  throw new Error(
    `${tag} does not match ${manifest.name}@${manifest.version}; tag version is ${tagVersion}`,
  )
}
if (manifest.publishConfig?.registry !== 'https://registry.npmjs.org/') {
  throw new Error(`${manifest.name} must publish to the public npm registry`)
}
if (manifest.publishConfig?.access !== 'public') {
  throw new Error(`${manifest.name} must publish with public access`)
}

for (const [key, value] of [
  ['package_slug', release.slug],
  ['package_name', manifest.name],
  ['package_version', manifest.version],
  ['package_directory', release.directory],
]) {
  process.stdout.write(`${key}=${value}\n`)
}
