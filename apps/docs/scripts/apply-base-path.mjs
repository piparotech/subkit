import { readFile, rm, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

import { walkFiles } from './docs-output-lib.mjs'

const distRoot = resolve(import.meta.dirname, '..', 'dist')
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.txt', '.xml'])
const routePrefixes = [
  '_nimbus',
  'concepts',
  'expo',
  'index.md',
  'index.mdx',
  'llms',
  'node',
  'operations',
  'pagefind',
  'reference',
  'robots.txt',
  'sitemap',
  'start',
  'stores',
]

function withDocsBase(value) {
  if (value === '/') return '/docs/'
  if (value.startsWith('/docs/')) return value
  if (value === '/docs') return '/docs/'
  if (routePrefixes.some((prefix) => value.slice(1).startsWith(prefix))) return `/docs${value}`
  return value
}

function rewrite(content) {
  return content
    .replaceAll('/docs_nimbus/', '/docs/_nimbus/')
    .replaceAll('/docsfavicon.svg', '/docs/favicon.svg')
    .replace(/(["'(=])\/(?!\/)([^"')\s<]*)/gu, (_match, prefix, rest) => {
      const original = `/${rest}`
      return `${prefix}${withDocsBase(original)}`
    })
    .replace(/\]\((\/[^)\s]+)\)/gu, (_match, target) => `](${withDocsBase(target)})`)
}

for (const path of await walkFiles(distRoot)) {
  if (!textExtensions.has(extname(path))) continue
  const content = await readFile(path, 'utf8')
  const rewritten = rewrite(content)
  if (rewritten !== content) await writeFile(path, rewritten)
}

await rm(join(distRoot, 'pagefind'), { force: true, recursive: true })
console.log('Applied /docs base path to static documentation output.')
