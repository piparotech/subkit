import { readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { pathExists, walkFiles } from './docs-output-lib.mjs'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(scriptDirectory, '..')
const contentRoot = join(appRoot, 'src/content/docs')
const distRoot = join(appRoot, 'dist')
const errors = []

function htmlOutput(urlPath) {
  const docsPath = urlPath.replace(/^\/docs\/?/u, '/')
  if (docsPath === '/') return join(distRoot, 'index.html')
  const clean = docsPath.replace(/^\//u, '').replace(/\/$/u, '')
  if (extname(clean) !== '') return join(distRoot, clean)
  return join(distRoot, clean, 'index.html')
}

function headingIds(html) {
  return new Set([...html.matchAll(/<h[1-6][^>]*\sid="([^"]+)"/gu)].map((match) => match[1]))
}

const contentFiles = (await walkFiles(contentRoot)).filter((path) =>
  ['.md', '.mdx'].includes(extname(path)),
)

for (const sourcePath of contentFiles) {
  const source = await readFile(sourcePath, 'utf8')
  const links = [...source.matchAll(/\[[^\]]+\]\((\/[^)\s]+)\)/gu)].map((match) => match[1])

  for (const href of links) {
    if (href.startsWith('/llms')) continue
    const url = new URL(href, 'https://subkit.piparo.tech/docs/')
    const output = htmlOutput(url.pathname)
    if (!(await pathExists(output))) {
      errors.push(`${sourcePath}: missing internal route ${url.pathname}`)
      continue
    }
    if (url.hash.length > 1) {
      const ids = headingIds(await readFile(output, 'utf8'))
      const hash = decodeURIComponent(url.hash.slice(1))
      if (!ids.has(hash)) errors.push(`${sourcePath}: missing heading ${url.pathname}${url.hash}`)
    }
  }
}

if (errors.length > 0) {
  console.error(`Internal link verification failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(
    `Verified internal routes and heading anchors in ${contentFiles.length} content files.`,
  )
}
