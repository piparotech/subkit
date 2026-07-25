import { stat } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

import { walkFiles } from './docs-output-lib.mjs'

const distRoot = resolve(import.meta.dirname, '..', 'dist')
const budgets = {
  totalBytes: 5_000_000,
  htmlBytes: 250_000,
  imageBytes: 250_000,
  pagefindBytes: 1_500_000,
  scriptBytes: 350_000,
  stylesheetBytes: 200_000,
}
const totals = { total: 0, pagefind: 0 }
const errors = []

for (const path of await walkFiles(distRoot)) {
  const size = (await stat(path)).size
  const name = relative(distRoot, path)
  totals.total += size
  if (name.startsWith('pagefind/')) totals.pagefind += size
  if (path.endsWith('.html') && size > budgets.htmlBytes) {
    errors.push(`${name} exceeds ${budgets.htmlBytes} bytes (${size})`)
  }
  if (/\.(?:png|jpg|jpeg|webp)$/u.test(path) && size > budgets.imageBytes) {
    errors.push(`${name} exceeds ${budgets.imageBytes} image bytes (${size})`)
  }
  if (path.endsWith('.js') && size > budgets.scriptBytes) {
    errors.push(`${name} exceeds ${budgets.scriptBytes} script bytes (${size})`)
  }
  if (path.endsWith('.css') && size > budgets.stylesheetBytes) {
    errors.push(`${name} exceeds ${budgets.stylesheetBytes} stylesheet bytes (${size})`)
  }
}

if (totals.total > budgets.totalBytes) {
  errors.push(`docs output exceeds ${budgets.totalBytes} total bytes (${totals.total})`)
}
if (totals.pagefind > budgets.pagefindBytes) {
  errors.push(`Pagefind exceeds ${budgets.pagefindBytes} bytes (${totals.pagefind})`)
}

if (errors.length > 0) {
  console.error(`Docs performance verification failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(
    `Verified docs performance budgets: ${totals.total} total bytes, ${totals.pagefind} Pagefind bytes.`,
  )
}
