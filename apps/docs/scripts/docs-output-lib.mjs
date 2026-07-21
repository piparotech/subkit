import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

const HTML_TITLE_PATTERN = /<title>([^<]*)<\/title>/u
const CANONICAL_PATTERN = /<link\s+rel="canonical"\s+href="([^"]*)"/u
const DESCRIPTION_PATTERN = /<meta\s+name="description"\s+content="([^"]*)"/u
const SITEMAP_URL_PATTERN = /<loc>([^<]+)<\/loc>/gu

export async function pathExists(path) {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false
    throw error
  }
}

export async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walkFiles(path)))
    if (entry.isFile()) files.push(path)
  }

  return files.sort()
}

export function toPosixPath(path) {
  return path.split(sep).join('/')
}

export function routeFromSource(sourcePath) {
  const extension = extname(sourcePath)
  const id = toPosixPath(sourcePath.slice(0, -extension.length))
  return id === 'index' ? '/' : `/${id}/`
}

export function outputPathFromRoute(route) {
  return route === '/' ? 'index.html' : `${route.slice(1)}index.html`
}

export function readFrontmatterScalar(source, key) {
  if (!source.startsWith('---\n')) return undefined
  const end = source.indexOf('\n---', 4)
  if (end === -1) return undefined
  const frontmatter = source.slice(4, end)
  const pattern = new RegExp(`^${key}:\\s*(.+)$`, 'mu')
  const value = frontmatter.match(pattern)?.[1]?.trim()
  if (value === undefined) return undefined
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function decodeHtmlText(value) {
  return value
    ?.replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
}

export function extractHtmlMetadata(html) {
  return {
    title: decodeHtmlText(html.match(HTML_TITLE_PATTERN)?.[1]),
    canonical: html.match(CANONICAL_PATTERN)?.[1],
    description: decodeHtmlText(html.match(DESCRIPTION_PATTERN)?.[1]),
  }
}

export function extractSitemapUrls(xml) {
  return [...xml.matchAll(SITEMAP_URL_PATTERN)].map((match) => match[1]).sort()
}

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

export async function sumFileBytes(files) {
  let bytes = 0
  for (const file of files) bytes += (await stat(file)).size
  return bytes
}

export function relativePosix(from, path) {
  return toPosixPath(relative(from, path))
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}
