import { readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  extractHtmlMetadata,
  extractSitemapUrls,
  outputPathFromRoute,
  pathExists,
  readFrontmatterScalar,
  relativePosix,
  routeFromSource,
  sha256,
  sumFileBytes,
  walkFiles,
} from './docs-output-lib.mjs'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(scriptDirectory, '..')
const contentRoot = join(appRoot, 'src/content/docs')
const distRoot = join(appRoot, 'dist')
const outputPath = join(appRoot, 'baseline/starlight-output.json')
const site = 'https://docs.subkit.piparo.tech'

if (!(await pathExists(distRoot))) {
  throw new Error('apps/docs/dist is missing. Run pnpm docs:build before capturing the baseline.')
}

const contentFiles = (await walkFiles(contentRoot)).filter((path) =>
  ['.md', '.mdx'].includes(extname(path)),
)
const pages = []

for (const sourceFile of contentFiles) {
  const sourcePath = relativePosix(contentRoot, sourceFile)
  const route = routeFromSource(sourcePath)
  const htmlPath = outputPathFromRoute(route)
  const absoluteHtmlPath = join(distRoot, htmlPath)
  if (!(await pathExists(absoluteHtmlPath))) {
    throw new Error(`Expected built page is missing: ${htmlPath} for ${sourcePath}`)
  }

  const source = await readFile(sourceFile, 'utf8')
  const html = await readFile(absoluteHtmlPath, 'utf8')
  const metadata = extractHtmlMetadata(html)
  const frontmatterTitle = readFrontmatterScalar(source, 'title')
  const frontmatterDescription = readFrontmatterScalar(source, 'description')

  if (frontmatterTitle === undefined) throw new Error(`Missing title frontmatter: ${sourcePath}`)
  if (metadata.title === undefined) throw new Error(`Missing HTML title: ${htmlPath}`)
  if (metadata.canonical === undefined) throw new Error(`Missing canonical URL: ${htmlPath}`)

  pages.push({
    source: sourcePath,
    sourceType: extname(sourcePath).slice(1),
    route,
    output: htmlPath,
    title: frontmatterTitle,
    description: frontmatterDescription,
    htmlTitle: metadata.title,
    canonical: metadata.canonical,
  })
}

const llmsFiles = [
  'llms.txt',
  'llms-small.txt',
  'llms-full.txt',
  '_llms-txt/mobile-expo--react-native.txt',
  '_llms-txt/backend-nodejs.txt',
  '_llms-txt/concepts.txt',
  '_llms-txt/reference-and-operations.txt',
]
const llms = []

for (const output of llmsFiles) {
  const absolutePath = join(distRoot, output)
  if (!(await pathExists(absolutePath)))
    throw new Error(`Expected LLM output is missing: ${output}`)
  const content = await readFile(absolutePath)
  llms.push({ output, bytes: content.byteLength, sha256: sha256(content) })
}

const sitemapFiles = (await walkFiles(distRoot)).filter((path) =>
  /^sitemap(?:-index|-\d+)?\.xml$/u.test(relativePosix(distRoot, path)),
)
const sitemapUrls = new Set()
for (const sitemapFile of sitemapFiles) {
  const xml = await readFile(sitemapFile, 'utf8')
  for (const url of extractSitemapUrls(xml)) sitemapUrls.add(url)
}

const pagefindRoot = join(distRoot, 'pagefind')
const pagefindFiles = (await pathExists(pagefindRoot)) ? await walkFiles(pagefindRoot) : []
const htmlFiles = (await walkFiles(distRoot)).filter((path) => extname(path) === '.html')

const manifest = {
  schemaVersion: 1,
  framework: {
    name: '@astrojs/starlight',
    version: '0.41.3',
    llmsPlugin: 'starlight-llms-txt@0.11.0',
  },
  site,
  expected: {
    publicContentPages: 33,
    mdxPages: 4,
    llmsOutputs: 7,
    invariants: [
      'SubKit is the source of truth for Catalog, Commerce, and Access.',
      'Access always follows: Access Source -> Access Pool -> Reservation/Allocation -> Entitlement Grant.',
      'Apps check entitlements, never subscription, plan, package, or store-product IDs.',
      'Mobile apps use only public app-bound SDK keys. Server keys belong only in trusted backends.',
      'Store purchases unlock access only after provider verification and an active entitlement.',
      'Mutations require the documented capability, an idempotency key, and an audit reason.',
      'Store reads may run automatically; store writes require preview, explicit confirmation, apply, then verify.',
    ],
  },
  pages: pages.sort((left, right) => left.route.localeCompare(right.route)),
  llms,
  sitemap: {
    files: sitemapFiles.map((path) => relativePosix(distRoot, path)).sort(),
    urls: [...sitemapUrls].sort(),
  },
  search: {
    engine: 'pagefind',
    fileCount: pagefindFiles.length,
    bytes: await sumFileBytes(pagefindFiles),
    entrypoint: 'pagefind/pagefind.js',
  },
  build: {
    htmlFileCount: htmlFiles.length,
    has404: await pathExists(join(distRoot, '404.html')),
  },
}

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Captured ${pages.length} pages and ${llms.length} LLM outputs in ${outputPath}`)
