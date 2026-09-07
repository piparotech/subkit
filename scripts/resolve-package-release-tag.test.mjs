import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')
const script = resolve(root, 'scripts/resolve-package-release-tag.mjs')

const expected = new Map(
  ['subkit-core', 'subkit-node', 'subkit-expo'].map((component) => {
    const manifest = JSON.parse(
      readFileSync(resolve(root, 'packages', component, 'package.json'), 'utf8'),
    )
    return [`${component}-v${manifest.version}`, manifest.name]
  }),
)

for (const [tag, packageName] of expected) {
  test(`resolves ${tag}`, () => {
    const output = execFileSync(process.execPath, [script, tag], { cwd: root, encoding: 'utf8' })
    assert.match(output, new RegExp(`^package_name=${packageName.replace('/', '\\/')}$`, 'mu'))
  })
}

for (const tag of [
  'v0.1.10',
  'subkit-core-v0.1.9',
  'subkit-node-v1',
  'subkit-expo-v0.1.12+build',
]) {
  test(`rejects ${tag}`, () => {
    const result = spawnSync(process.execPath, [script, tag], { cwd: root, encoding: 'utf8' })
    assert.notEqual(result.status, 0)
  })
}
