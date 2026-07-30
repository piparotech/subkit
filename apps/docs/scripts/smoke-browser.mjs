import { chromium, devices } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const image = process.env.SUBKIT_DOCS_IMAGE ?? 'subkit-docs:local'
const port = process.env.SUBKIT_DOCS_SMOKE_PORT ?? '18082'
const baseUrl = `http://127.0.0.1:${port}`
const artifacts = resolve(root, 'test-results/docs-browser')

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`${command} exited with ${code}`))
    })
  })
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`)
      if (response.ok) return
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
  }
  throw new Error('Docs container did not become healthy')
}

await mkdir(artifacts, { recursive: true })
await run('docker', ['rm', '-f', 'subkit-docs-browser-smoke']).catch(() => {})
await run('docker', [
  'run',
  '-d',
  '--name',
  'subkit-docs-browser-smoke',
  '--platform',
  'linux/amd64',
  '-p',
  `${port}:8080`,
  image,
])

try {
  await waitForHealth()
  const browser = await chromium.launch()
  try {
    const viewports = [
      { name: 'mobile', use: devices['iPhone 13'] },
      { name: 'tablet', use: { viewport: { height: 1024, width: 768 } } },
      { name: 'desktop', use: devices['Desktop Chrome'] },
    ]

    for (const viewport of viewports) {
      const context = await browser.newContext({
        ...viewport.use,
        reducedMotion: 'reduce',
      })
      const page = await context.newPage()
      await page.goto(`${baseUrl}/docs/`, { waitUntil: 'networkidle' })
      await page.locator('h1').waitFor()
      if ((await page.locator('main').getAttribute('data-pagefind-body')) == null) {
        throw new Error(`${viewport.name}: missing Pagefind body`)
      }
      await page.screenshot({
        fullPage: true,
        path: resolve(artifacts, `${viewport.name}.png`),
      })
      await context.close()
    }

    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto(`${baseUrl}/docs/`, { waitUntil: 'networkidle' })
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'Skip to content' })
    if ((await skipLink.evaluate((element) => document.activeElement === element)) !== true) {
      throw new Error('Skip link is not the first keyboard target')
    }
    await page.keyboard.press('Enter')
    if (
      (await page
        .locator('#main-content')
        .evaluate((element) => document.activeElement === element)) !== true
    ) {
      throw new Error('Skip link did not focus main content')
    }

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
    const dialog = page.getByRole('dialog', { name: 'Search documentation' })
    await dialog.waitFor({ state: 'visible' })
    const input = dialog.getByRole('combobox')
    for (const query of ['access', 'entitlement', 'feature gate', 'device blocked', 'Pro']) {
      await input.fill(query)
      await page.getByRole('option').first().waitFor({ state: 'visible' })
      const accessResult = page.getByRole('option').filter({ hasText: 'Checking effective access' })
      await accessResult.first().waitFor({ state: 'visible' })
    }
    await page.keyboard.press('Escape')
    if (await dialog.isVisible()) throw new Error('Search dialog did not close with Escape')

    const missing = await page.goto(`${baseUrl}/docs/not-a-real-page`)
    if (missing?.status() !== 404) throw new Error(`Expected docs 404, got ${missing?.status()}`)
    await page.getByRole('heading', { name: /Page not found/i }).waitFor()
    await context.close()
  } finally {
    await browser.close()
  }
  console.log(
    'Verified docs at mobile/tablet/desktop, reduced motion, keyboard skip, search, and 404.',
  )
} finally {
  await run('docker', ['rm', '-f', 'subkit-docs-browser-smoke']).catch(() => {})
}
