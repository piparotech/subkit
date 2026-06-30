import { useMemo, useRef, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIBadge, PUIButton, PUISegmentedControl, PUIText } from '@/components/ui'
import {
  type Entitlement,
  PaymentsError,
  type Plan,
  createPaymentsClient,
  isPro,
} from '@/lib/payments-iap-stripe'

import {
  BASE_URL,
  type CheckoutOutcome,
  DEMO_NOW,
  InMemoryPaymentsBackend,
  SEEDED_PLANS,
  createMockStore,
  installMockFetch,
} from './mock-payments-iap-stripe'

type Rail = 'native' | 'web'
type LogEntry = { id: number; ok: boolean; text: string }

const RAIL_OPTIONS = [
  { value: 'native', label: 'Native IAP' },
  { value: 'web', label: 'Stripe web' },
]

const INTERVAL_LABEL: Record<Plan['interval'], string> = {
  weekly: 'per week',
  monthly: 'per month',
  annual: 'per year',
  lifetime: 'one-off',
}

function expiryLabel(entitlement: Entitlement): string {
  if (!entitlement.expiresAt) return 'no expiry'
  const date = new Date(entitlement.expiresAt)
  return `renews ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function PlanRow({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      aria-pressed={selected}
      className={`flex w-full items-baseline justify-between gap-4 rounded-lg border px-4 py-3 text-left transition-colors ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/40 bg-card'
      }`}
      onClick={onSelect}
      type="button"
    >
      <span className="flex flex-col gap-0.5">
        <PUIText className="font-medium" variant="callout">
          {plan.title}
        </PUIText>
        <PUIText tone="muted" variant="footnote">
          {plan.description}
        </PUIText>
      </span>
      <PUIText className="shrink-0 font-mono" tone="subtle" variant="caption1">
        {INTERVAL_LABEL[plan.interval]}
      </PUIText>
    </button>
  )
}

function PaymentsIapStripeDemo() {
  const backend = useMemo(() => new InMemoryPaymentsBackend(), [])
  const [rail, setRail] = useState<Rail>('native')
  const [planId, setPlanId] = useState(SEEDED_PLANS[1].id)
  const [tamper, setTamper] = useState(false)
  const [entitlement, setEntitlement] = useState<Entitlement>(backend.status)
  const [pending, setPending] = useState(false)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const nextEntryId = useRef(0)

  const plan = SEEDED_PLANS.find((p) => p.id === planId) ?? SEEDED_PLANS[0]
  const pro = isPro(entitlement, DEMO_NOW)

  const log = (ok: boolean, text: string) =>
    setEntries((prev) => [{ id: nextEntryId.current++, ok, text }, ...prev].slice(0, 6))

  /** Run a block with the in-memory backend installed as the Engine's fetch, then restore it. */
  async function withBackend<T>(run: () => Promise<T>): Promise<T> {
    const uninstall = installMockFetch(backend)
    try {
      return await run()
    } finally {
      uninstall()
    }
  }

  async function buy() {
    setPending(true)
    await withBackend(async () => {
      const client = createPaymentsClient({
        baseUrl: BASE_URL,
        getToken: () => 'demo-session-token',
        store: createMockStore(planId, { tamper }),
      })
      try {
        if (rail === 'native') {
          const result = await client.purchaseNative({
            planId,
            storeProductId: plan.storeProductId,
          })
          setEntitlement(result)
          log(true, `Apple receipt validated server-side, ${plan.title} entitlement granted`)
        } else {
          const { url } = await client.startCheckout({
            planId,
            successUrl: 'https://app.demo.piparo/billing?ok=1',
            cancelUrl: 'https://app.demo.piparo/billing',
          })
          confirmStripe(url, 'success')
        }
      } catch (err) {
        const code = err instanceof PaymentsError ? err.code : 'UNKNOWN'
        log(false, `purchase denied server-side: ${code}`)
        setEntitlement(backend.status)
      }
    })
    setPending(false)
  }

  function confirmStripe(url: string, outcome: CheckoutOutcome) {
    const result = backend.confirmCheckout(url, outcome)
    setEntitlement(result)
    log(
      outcome === 'success',
      outcome === 'success'
        ? `Stripe confirmed server-side, ${plan.title} entitlement granted`
        : 'Stripe Checkout cancelled, status unchanged',
    )
  }

  async function restore() {
    setPending(true)
    await withBackend(async () => {
      const client = createPaymentsClient({
        baseUrl: BASE_URL,
        getToken: () => 'demo-session-token',
        store: createMockStore(planId),
      })
      const result = await client.restoreNative({ planId })
      setEntitlement(result)
      log(result.active, result.active ? 'restored prior purchase' : 'nothing to restore')
    })
    setPending(false)
  }

  function reset() {
    backend.reset()
    setEntitlement(backend.status)
    setEntries([])
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <PUIText as="h2" className="tracking-tight" variant="title3">
              Unlock Pro
            </PUIText>
            <PUIText className="max-w-md" tone="muted" variant="subheadline">
              Two purchase rails, native In-App-Purchase and Stripe on the web, resolve to one
              server-validated entitlement, so mobile and web stay in sync.
            </PUIText>
          </div>
          <PUIBadge dot variant={pro ? 'success' : 'secondary'}>
            {pro ? 'Pro active' : 'No active plan'}
          </PUIBadge>
        </div>

        <PUISegmentedControl
          onValueChange={(value) => setRail(value as Rail)}
          options={RAIL_OPTIONS}
          value={rail}
        />

        <div className="flex flex-col gap-2">
          {SEEDED_PLANS.map((p) => (
            <PlanRow
              key={p.id}
              onSelect={() => setPlanId(p.id)}
              plan={p}
              selected={p.id === planId}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PUIButton loading={pending} onPress={buy}>
            {rail === 'native' ? 'Buy with In-App-Purchase' : 'Continue to Stripe'}
          </PUIButton>
          {rail === 'native' ? (
            <PUIButton disabled={pending} onPress={restore} variant="outline">
              Restore purchases
            </PUIButton>
          ) : null}
          {pro ? (
            <PUIButton disabled={pending} onPress={reset} size="sm" variant="ghost">
              Reset
            </PUIButton>
          ) : null}
        </div>

        {rail === 'native' ? (
          <label className="flex items-center gap-2 self-start">
            <input
              checked={tamper}
              className="accent-primary size-4"
              onChange={(event) => setTamper(event.target.checked)}
              type="checkbox"
            />
            <PUIText tone="muted" variant="footnote">
              Tamper with the receipt to see the server refuse to grant Pro
            </PUIText>
          </label>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <PUIText className="font-medium" variant="subheadline">
          Pro feature
        </PUIText>
        {pro ? (
          <div className="border-border flex items-center justify-between gap-4 border-y py-4">
            <PUIText tone="muted" variant="footnote">
              Unlocked via <span className="text-foreground font-mono">{entitlement.provider}</span>{' '}
              on the <span className="text-foreground font-mono">{entitlement.planId}</span> plan (
              {expiryLabel(entitlement)}).
            </PUIText>
            <PUIBadge variant="success">Available</PUIBadge>
          </div>
        ) : (
          <div className="border-border flex items-center justify-between gap-4 border-y py-4">
            <PUIText tone="subtle" variant="footnote">
              This function is reserved for Pro members. The UI gates on the server entitlement
              alone, never on a client-reported receipt.
            </PUIText>
            <PUIBadge variant="outline">Locked</PUIBadge>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <PUIText className="font-medium" variant="subheadline">
            Server round trip
          </PUIText>
          {entries.length > 0 ? (
            <button
              className="text-muted-foreground hover:text-foreground text-footnote"
              onClick={() => setEntries([])}
              type="button"
            >
              Clear
            </button>
          ) : null}
        </div>
        {entries.length === 0 ? (
          <PUIText tone="muted" variant="footnote">
            Each action runs the real Engine against the in-memory server and logs the outcome here.
          </PUIText>
        ) : (
          <ul className="divide-border divide-y">
            {entries.map((entry) => (
              <li className="flex items-start gap-3 py-2.5" key={entry.id}>
                <PUIBadge variant={entry.ok ? 'success' : 'destructive'}>
                  {entry.ok ? 'granted' : 'denied'}
                </PUIBadge>
                <PUIText className="min-w-0 flex-1" tone="muted" variant="footnote">
                  {entry.text}
                </PUIText>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PUIText className="border-border border-t pt-4" tone="subtle" variant="footnote">
        Same pure Engine the platform runs: the isomorphic payments client and the offline
        receipt-to-entitlement mapping, driven here through an in-memory server with no network. The
        server is always the authority on what unlocks Pro.
      </PUIText>
    </div>
  )
}

const meta = {
  title: 'Modules/Payments (In-App + Stripe)',
  component: PaymentsIapStripeDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Offer and redeem App-Store-conformant purchases and subscriptions on mobile (expo-iap) and the web (Stripe Checkout), both resolving to one server-validated entitlement. In-memory demo: three seeded plans (weekly, annual, lifetime); pick a rail and a plan, then buy through native IAP or Stripe to unlock the gated Pro feature, restore a prior purchase, or tamper with a receipt to watch the server refuse to grant Pro.',
      },
    },
  },
} satisfies Meta<typeof PaymentsIapStripeDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
