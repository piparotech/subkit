import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { readPackageVersion } from './package-manifest-version.mjs'

const temporary = mkdtempSync(join(tmpdir(), 'subkit-package-version-test-'))

try {
  const valid = join(temporary, 'valid')
  const missing = join(temporary, 'missing')
  const malformed = join(temporary, 'malformed')
  mkdirSync(valid)
  mkdirSync(missing)
  mkdirSync(malformed)
  writeFileSync(join(valid, 'package.json'), '{"version":"1.2.3"}\n')
  writeFileSync(join(missing, 'package.json'), '{"name":"missing-version"}\n')
  writeFileSync(join(malformed, 'package.json'), '{not-json}\n')

  assert.equal(readPackageVersion(temporary, 'valid'), '1.2.3')
  assert.throws(() => readPackageVersion(temporary, 'missing'), /Missing package version/u)
  assert.throws(() => readPackageVersion(temporary, 'malformed'), SyntaxError)
  console.log('Verified package manifest version parsing.')
} finally {
  rmSync(temporary, { force: true, recursive: true })
}
