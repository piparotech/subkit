import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractHtmlMetadata, pathExists, readJson, walkFiles } from './docs-output-lib.mjs'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(scriptDirectory, '..')
const distRoot = join(appRoot, 'dist')
const baselinePath = join(appRoot, 'baseline/starlight-output.json')
const baseline = await readJson(baselinePath)
const errors = []

const intentionalLlmsReplacements = {
  '_llms-txt/mobile-expo--react-native.txt': 'llms-mobile.txt',
  '_llms-txt/backend-nodejs.txt': 'llms-backend.txt',
  '_llms-txt/concepts.txt': 'llms-concepts.txt',
  '_llms-txt/reference-and-operations.txt': 'llms-operations.txt',
}

function check(condition, message) {
  if (!condition) errors.push(message)
}

for (const page of baseline.pages) {
  const htmlPath = join(distRoot, page.output)
  check(await pathExists(htmlPath), `Missing HTML route ${page.route} (${page.output})`)
  if (!(await pathExists(htmlPath))) continue

  const html = await readFile(htmlPath, 'utf8')
  const metadata = extractHtmlMetadata(html)
  const expectedCanonical = new URL(
    page.route.replace(/^\//u, ''),
    'https://subkit.piparo.tech/docs/',
  ).href
  check(metadata.canonical === expectedCanonical, `Canonical changed for ${page.route}`)
  check(
    metadata.title?.startsWith(page.title) === true,
    `Title no longer starts with "${page.title}" for ${page.route}`,
  )
  if (page.description !== undefined) {
    check(metadata.description === page.description, `Description changed for ${page.route}`)
  }
  check(html.includes('application/ld+json'), `Missing JSON-LD for ${page.route}`)
  check(html.includes('type="text/markdown"'), `Missing Markdown alternate for ${page.route}`)
  check(html.includes('data-ai-agent-directive'), `Missing agent directive for ${page.route}`)

  const markdownOutput =
    page.route === '/' ? 'index.md' : `${page.route.replace(/^\//u, '')}index.md`
  const sourceOutput =
    page.route === '/' ? 'index.mdx' : `${page.route.replace(/^\//u, '')}index.mdx`
  check(await pathExists(join(distRoot, markdownOutput)), `Missing Markdown twin ${markdownOutput}`)
  check(await pathExists(join(distRoot, sourceOutput)), `Missing raw-source twin ${sourceOutput}`)
  const sourcePath = join(appRoot, 'src/content/docs', page.source)
  const builtSourcePath = join(distRoot, sourceOutput)
  if ((await pathExists(sourcePath)) && (await pathExists(builtSourcePath))) {
    const canonicalSource = await readFile(sourcePath)
    const builtSource = await readFile(builtSourcePath)
    check(
      canonicalSource.equals(builtSource),
      `Raw-source twin is not byte-identical for ${page.source}`,
    )
  }
}

check(
  baseline.pages.length === baseline.expected.publicContentPages,
  'Baseline page count is inconsistent',
)
check(
  baseline.pages.filter((page) => page.sourceType === 'mdx').length === baseline.expected.mdxPages,
  'Baseline MDX page count is inconsistent',
)

const contentRoot = join(appRoot, 'src/content/docs')
const publicSources = (await walkFiles(contentRoot)).filter(
  (path) => path.endsWith('.md') || path.endsWith('.mdx'),
)
for (const sourcePath of publicSources) {
  const relative = sourcePath.slice(contentRoot.length + 1)
  const slug = relative.replace(/\.(?:md|mdx)$/u, '')
  const outputBase = slug === 'index' ? 'index' : slug
  const htmlOutput = outputBase === 'index' ? 'index.html' : `${outputBase}/index.html`
  const markdownOutput = outputBase === 'index' ? 'index.md' : `${outputBase}/index.md`
  const sourceOutput = outputBase === 'index' ? 'index.mdx' : `${outputBase}/index.mdx`
  check(await pathExists(join(distRoot, htmlOutput)), `Missing public HTML page ${htmlOutput}`)
  check(
    await pathExists(join(distRoot, markdownOutput)),
    `Missing public Markdown twin ${markdownOutput}`,
  )
  check(
    await pathExists(join(distRoot, sourceOutput)),
    `Missing public source twin ${sourceOutput}`,
  )
}

for (const llms of baseline.llms) {
  const output = intentionalLlmsReplacements[llms.output] ?? llms.output
  const path = join(distRoot, output)
  check(await pathExists(path), `Missing LLM output ${output} (baseline: ${llms.output})`)
}

const agentOutputMaxBytes = {
  'llms.txt': 20_000,
  'llms-small.txt': 50_000,
  'llms-full.txt': 180_000,
  'llms-mobile.txt': 90_000,
  'llms-backend.txt': 40_000,
  'llms-concepts.txt': 40_000,
  'llms-api.txt': 40_000,
  'llms-operations.txt': 70_000,
}

const requiredAgentOutputs = [
  'llms.txt',
  'llms-small.txt',
  'llms-full.txt',
  'llms-mobile.txt',
  'llms-backend.txt',
  'llms-concepts.txt',
  'llms-api.txt',
  'llms-operations.txt',
  'concepts/llms.txt',
  'expo/llms.txt',
  'node/llms.txt',
  'operations/llms.txt',
  'reference/llms.txt',
  'start/llms.txt',
  'stores/llms.txt',
  'robots.txt',
]
for (const output of requiredAgentOutputs) {
  check(await pathExists(join(distRoot, output)), `Missing required agent surface ${output}`)
}

const invariantOutputs = [
  'llms.txt',
  'llms-small.txt',
  'llms-mobile.txt',
  'llms-backend.txt',
  'llms-concepts.txt',
  'llms-api.txt',
  'llms-operations.txt',
]
for (const output of invariantOutputs) {
  const path = join(distRoot, output)
  if (!(await pathExists(path))) continue
  const content = await readFile(path, 'utf8')
  for (const invariant of baseline.expected.invariants) {
    check(content.includes(invariant), `${output} is missing invariant: ${invariant}`)
  }
}

for (const output of requiredAgentOutputs.filter((path) => path.endsWith('.txt'))) {
  const path = join(distRoot, output)
  if (!(await pathExists(path))) continue
  const content = await readFile(path, 'utf8')
  check(content.trim().length >= 40, `${output} is unexpectedly small`)
  const maxBytes = agentOutputMaxBytes[output]
  if (maxBytes !== undefined) {
    const bytes = Buffer.byteLength(content)
    const estimatedTokens = Math.ceil(content.length / 4)
    const maxEstimatedTokens = Math.ceil(maxBytes / 4)
    check(
      bytes <= maxBytes,
      `${output} exceeds its ${maxBytes}-byte / ~${maxEstimatedTokens}-token budget (${bytes} bytes / ~${estimatedTokens} tokens)`,
    )
  }
  check(
    !/<(Aside|Card|CardGrid|LinkCard|Steps|Step)\b/u.test(content),
    `${output} contains an unrendered docs component`,
  )
}

const pagefindRoot = join(distRoot, 'pagefind')
check(await pathExists(join(pagefindRoot, 'pagefind.js')), 'Missing Pagefind entrypoint')
if (await pathExists(pagefindRoot)) {
  const pagefindFiles = await walkFiles(pagefindRoot)
  check(pagefindFiles.length > 0, 'Pagefind output is empty')
}

check(await pathExists(join(distRoot, 'sitemap-index.xml')), 'Missing sitemap-index.xml')
check(await pathExists(join(distRoot, '404.html')), 'Missing static 404.html')
check(await pathExists(join(distRoot, 'favicon.png')), 'Missing production favicon')
check(await pathExists(join(distRoot, 'og.png')), 'Missing production Open Graph image')

const htmlFiles = (await walkFiles(distRoot)).filter((path) => path.endsWith('.html'))
for (const path of htmlFiles) {
  const html = await readFile(path, 'utf8')
  check(
    !/(?:href|src)="\/(?!docs\/|\/)/u.test(html),
    `Root-relative URL escapes the /docs base path in ${path}`,
  )
}

const sitemap = await readFile(join(distRoot, 'sitemap-0.xml'), 'utf8')
check(
  !sitemap.includes('<loc>https://subkit.piparo.tech/</loc>'),
  'Sitemap exposes the dashboard root as a docs URL',
)
check(
  sitemap.includes('<loc>https://subkit.piparo.tech/docs/</loc>'),
  'Sitemap is missing the /docs canonical root',
)

const publicTextFiles = (await walkFiles(distRoot)).filter((path) =>
  ['.md', '.mdx', '.txt'].some((extension) => path.endsWith(extension)),
)
for (const path of publicTextFiles) {
  const content = await readFile(path, 'utf8')
  check(!/sk_(?:srv|sdk)_[A-Za-z0-9]{12,}/u.test(content), `Possible real SubKit key in ${path}`)
  check(
    !/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/u.test(content),
    `Possible private key in ${path}`,
  )
  check(
    !/https?:\/\/(?:10\.|192\.168\.|[^/\s]+\.internal)/u.test(content),
    `Possible internal host in ${path}`,
  )
}

if (errors.length > 0) {
  console.error(`Docs output verification failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(
    `Verified ${publicSources.length} public HTML routes and twins (${baseline.pages.length} historical baseline routes), ${requiredAgentOutputs.length} agent surfaces, Pagefind, sitemap, 404, JSON-LD, alternates, and ${baseline.expected.invariants.length} llms.txt invariants.`,
  )
}
