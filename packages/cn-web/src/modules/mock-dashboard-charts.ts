/**
 * In-memory seam for the dashboard-charts demo. The Shell owns no domain data: the host supplies the
 * rows and a stable clock, and the vendored Engine aggregators turn them into KPIs, series and
 * distributions. This mock is that host data source, a deterministic offline order log (no server, no
 * Date.now in the math, a fixed DEMO_NOW) so every render produces identical charts. It mirrors the
 * native showcase mock one to one, so both showcases tell the same story.
 */

export type DemoChannel = 'Web' | 'App' | 'Marktplatz' | 'Filiale'

export type DemoOrder = {
  id: string
  /** Order timestamp (epoch millis). */
  at: number
  /** Net amount in EUR. */
  amount: number
  channel: DemoChannel
}

/** Fixed clock so the windows and buckets are reproducible across renders and platforms. */
export const DEMO_NOW = Date.UTC(2026, 5, 24, 12, 0, 0) // 2026-06-24T12:00:00Z

const DAY_MS = 24 * 60 * 60 * 1000
const CHANNELS: readonly DemoChannel[] = ['Web', 'App', 'Marktplatz', 'Filiale']

/** A tiny deterministic PRNG (mulberry32) so the seeded data is stable without a runtime dep. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Seed ~400 days of orders ending at DEMO_NOW: a mild upward revenue trend with weekend dips and a
 * channel mix weighted toward Web/App, so the KPI deltas, the bar series and the distribution all
 * show meaningful (non-flat) shapes for every range preset.
 */
export function seedDemoOrders(): DemoOrder[] {
  const rng = mulberry32(20260624)
  const orders: DemoOrder[] = []
  const days = 400
  let id = 0

  for (let dayOffset = days; dayOffset >= 0; dayOffset--) {
    const dayStart = DEMO_NOW - dayOffset * DAY_MS
    const weekday = new Date(dayStart).getUTCDay()
    const isWeekend = weekday === 0 || weekday === 6
    const trend = 1 + (days - dayOffset) / days // 1.0 -> 2.0 over the window
    const base = (isWeekend ? 3 : 6) * trend
    const count = Math.max(0, Math.round(base + (rng() - 0.5) * 4))

    for (let n = 0; n < count; n++) {
      const channel = CHANNELS[Math.floor(rng() * CHANNELS.length)] ?? 'Web'
      const amount = Math.round((40 + rng() * 260) * (channel === 'Filiale' ? 1.4 : 1))
      orders.push({ id: `o-${id++}`, at: dayStart + Math.floor(rng() * DAY_MS), amount, channel })
    }
  }

  return orders
}

export const CHANNEL_LABELS: Record<DemoChannel, string> = {
  Web: 'Web shop',
  App: 'Mobile app',
  Marktplatz: 'Marketplace',
  Filiale: 'In store',
}
