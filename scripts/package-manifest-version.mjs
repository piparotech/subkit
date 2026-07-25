import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export function readPackageVersion(root, packageDirectory) {
  const manifestPath = join(root, packageDirectory, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new Error(`Missing package version in ${packageDirectory}/package.json`)
  }
  return manifest.version
}
