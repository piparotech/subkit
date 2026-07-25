import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

import { walkFiles } from './docs-output-lib.mjs'

const contentRoot = resolve(import.meta.dirname, '..', 'src/content/docs')
const externalUrls = new Set()
const errors = []

for (const path of await walkFiles(contentRoot)) {
  if (!['.md', '.mdx'].includes(extname(path))) continue
  const source = await readFile(path, 'utf8')
  for (const match of source.matchAll(/\[[^\]]+\]\((https:\/\/[^)\s]+)\)/gu)) {
    const url = match[1]
    if (url.includes('.example.') || url.includes('<')) continue
    if (new URL(url).hostname === 'subkit.piparo.tech') continue
    externalUrls.add(url)
  }
}

const retryDelays = [1_000, 2_000, 4_000]

const request = (url, method) =>
  fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
    headers: { 'user-agent': 'SubKit docs link verifier' },
  })

const wait = (duration) => new Promise((resolveWait) => setTimeout(resolveWait, duration))

async function verifyUrl(url) {
  let lastError
  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      let response = await request(url, 'HEAD')
      if (response.status === 405 || response.status === 403) {
        response = await request(url, 'GET')
      }
      if (response.ok || (response.status !== 429 && response.status < 500)) return response
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }

    const delay = retryDelays[attempt]
    if (delay !== undefined) await wait(delay)
  }
  throw lastError
}

for (const url of [...externalUrls].sort()) {
  try {
    const response = await verifyUrl(url)
    if (!response.ok) errors.push(`${url}: HTTP ${response.status}`)
  } catch (error) {
    errors.push(`${url}: ${error instanceof Error ? error.message : 'request failed'}`)
  }
}

if (errors.length > 0) {
  console.error(`External link verification failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`Verified ${externalUrls.size} external documentation links.`)
}
