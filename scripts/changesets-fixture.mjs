import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

export const root = resolve(import.meta.dirname, '..')
export const names = ['core', 'node', 'expo']
export const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
export const putJson = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
export function command(dir, executable, args) {
  return execFileSync(executable, args, {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true', NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}
export function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'subkit-release-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  for (const file of [
    'package.json',
    'pnpm-workspace.yaml',
    '.changeset/config.json',
    ...names.flatMap((name) => [
      `packages/subkit-${name}/package.json`,
      `packages/subkit-${name}/CHANGELOG.md`,
    ]),
    'apps/docs/package.json',
  ]) {
    mkdirSync(dirname(join(dir, file)), { recursive: true })
    writeFileSync(join(dir, file), readFileSync(join(root, file)))
  }
  // Fixed 0.x test baseline; normal releases must not invalidate the matrix.
  for (const [index, name] of names.entries()) {
    const file = join(dir, `packages/subkit-${name}/package.json`)
    putJson(file, { ...readJson(file), version: ['0.1.10', '0.1.10', '0.1.12'][index] })
  }
  symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'))
  for (const name of ['node', 'expo']) {
    mkdirSync(join(dir, `packages/subkit-${name}/node_modules/@piparotech`), { recursive: true })
    symlinkSync(
      join(dir, 'packages/subkit-core'),
      join(dir, `packages/subkit-${name}/node_modules/@piparotech/subkit-core`),
    )
  }
  writeFileSync(join(dir, '.gitignore'), 'node_modules/\npacked/\n')
  command(dir, 'git', ['init', '--quiet'])
  command(dir, 'git', ['config', 'user.name', 'Release fixture'])
  command(dir, 'git', ['config', 'user.email', 'fixture@example.invalid'])
  command(dir, 'git', ['config', 'commit.gpgsign', 'false'])
  commit(dir)
  return dir
}
export function commit(dir) {
  command(dir, 'git', ['add', '.'])
  command(dir, 'git', ['-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'fixture'])
}
export function addChangeset(dir, name, type = 'patch') {
  writeFileSync(
    join(dir, '.changeset/change.md'),
    `---\n"${name}": ${type}\n---\n\nImprove the documented consumer behavior.\n`,
  )
}
export function version(dir) {
  return command(dir, process.execPath, [
    join(root, 'node_modules/@changesets/cli/bin.js'),
    'version',
  ])
}
export function noChangesetVersion(dir) {
  return spawnSync(
    process.execPath,
    [join(root, 'node_modules/@changesets/cli/bin.js'), 'version'],
    { cwd: dir, encoding: 'utf8' },
  )
}
