import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')
const script = resolve(root, 'scripts/check-public-package-version.mjs')

function run(expectedState, responses) {
  const testSetup = `
    const responses = ${JSON.stringify(responses)};
    globalThis.fetch = async () => {
      const response = responses.shift();
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: async () => response.body,
      };
    };
  `
  const environment = { ...process.env }
  delete environment.NODE_AUTH_TOKEN
  return spawnSync(
    process.execPath,
    [
      '--import',
      `data:text/javascript,${encodeURIComponent(testSetup)}`,
      script,
      '@piparotech/example',
      '1.2.3',
      expectedState,
    ],
    { cwd: root, encoding: 'utf8', env: environment },
  )
}

const existingPackument = {
  name: '@piparotech/example',
  versions: {
    '1.2.2': {
      name: '@piparotech/example',
      version: '1.2.2',
      dist: {
        integrity: 'sha512-existing',
        tarball: 'https://registry.npmjs.org/@piparotech/example/-/example-1.2.2.tgz',
      },
    },
  },
}

test('accepts an absent version when the package already exists', () => {
  const result = run('absent', [{ status: 200, body: existingPackument }])
  assert.equal(result.status, 0, result.stderr)
})

test('rejects an existing version', () => {
  const packument = structuredClone(existingPackument)
  packument.versions['1.2.3'] = {
    name: '@piparotech/example',
    version: '1.2.3',
    dist: {
      integrity: 'sha512-target',
      tarball: 'https://registry.npmjs.org/@piparotech/example/-/example-1.2.3.tgz',
    },
  }
  const result = run('absent', [{ status: 200, body: packument }])
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /already exists/u)
})

test('accepts an entirely absent package', () => {
  const result = run('absent', [{ status: 404, body: { error: 'Not found' } }])
  assert.equal(result.status, 0, result.stderr)
})

test('rejects public metadata checks that receive registry credentials', () => {
  const result = spawnSync(process.execPath, [script, '@piparotech/example', '1.2.3', 'absent'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NODE_AUTH_TOKEN: 'sentinel' },
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /must not receive NODE_AUTH_TOKEN/u)
})
