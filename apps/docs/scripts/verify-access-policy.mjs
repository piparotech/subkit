import { readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

import { walkFiles } from './docs-output-lib.mjs'

const root = resolve(import.meta.dirname, '../../..')
const contentRoot = join(root, 'apps/docs/src/content/docs')
const migrationPath = join(contentRoot, 'expo/migrating-effective-access.md')
const errors = []

const forbiddenPatterns = [
  {
    label: 'deprecated useSubKitEntitlement API',
    pattern: /\buseSubKitEntitlement\b/u,
  },
  {
    label: 'raw entitlement active gate',
    pattern: /entitlements(?:\[[^\]]+\]|\.[A-Za-z_][A-Za-z0-9_]*)[^\n]{0,120}\.active/u,
  },
  {
    label: 'device-global commerciallyActive policy',
    pattern: /\bcommerciallyActive\b/u,
  },
  {
    label: 'raw CustomerInfo device block gate',
    pattern: /customerInfo\.deviceAccess[^\n]{0,120}blockedReason/u,
  },
]

for (const path of await walkFiles(contentRoot)) {
  if (!path.endsWith('.md') && !path.endsWith('.mdx')) continue
  if (path === migrationPath) continue
  const source = await readFile(path, 'utf8')
  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(source)) {
      errors.push(`${relative(root, path)} contains ${label}`)
    }
  }
}

const migration = await readFile(migrationPath, 'utf8')
if (!migration.includes('Legacy example — do not copy.')) {
  errors.push('Effective Access migration guide must mark its legacy example as non-copyable')
}
if (!migration.includes("access.state === 'granted'")) {
  errors.push('Effective Access migration guide must show the canonical granted decision')
}

if (errors.length > 0) {
  console.error(`Effective Access documentation policy failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(
    'Verified public docs use one Effective Access policy; legacy checks are migration-only.',
  )
}
