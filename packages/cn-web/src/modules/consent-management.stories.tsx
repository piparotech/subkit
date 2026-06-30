import { useCallback, useId, useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIBadge, PUIButton, PUILinkText, PUISwitch, PUIText } from '@/components/ui'
import {
  type ConsentCategory,
  type ConsentDecision,
  type ConsentInit,
  acceptAll,
  allowsIdentifier,
  decideCategories,
  isCategoryGranted,
  isDecided,
  rejectAll,
} from '@/lib/consent-management'

import { DEMO_SDKS, createMockConsentStore, createMockGateManager } from './mock-consent-management'

const INIT: ConsentInit = { mode: 'category', version: 1 }
const PRIVACY_URL = 'https://piparo.tech/datenschutz'

/** The optional categories the banner lets the user toggle (necessary is always on, never shown as a switch). */
const OPTIONAL_CATEGORIES: ReadonlyArray<{
  id: Exclude<ConsentCategory, 'necessary'>
  title: string
  blurb: string
}> = [
  {
    id: 'statistics',
    title: 'Statistics',
    blurb: 'Anonymous, first-party usage and error analytics to improve the product.',
  },
  {
    id: 'marketing',
    title: 'Marketing',
    blurb: 'Ad attribution and remarketing, may carry a personal identifier to third parties.',
  },
]

/** A small controller around the pure Engine: it persists every decision to the in-memory store and
 *  reconciles the demo SDK gates without a reload, exactly like the host Shell does in production. */
function useConsentDemo() {
  const store = useMemo(() => createMockConsentStore({ init: INIT }), [])
  const gate = useMemo(() => createMockGateManager(), [])
  const [decision, setDecision] = useState<ConsentDecision>(() => store.load())

  const commit = useCallback(
    (next: ConsentDecision) => {
      store.save(next)
      gate.apply(next)
      setDecision(next)
    },
    [store, gate],
  )

  const reset = useCallback(() => {
    store.clear()
    const cleared = store.load()
    gate.apply(cleared)
    setDecision(cleared)
  }, [store, gate])

  return { decision, gate, commit, reset }
}

function CategoryRow({
  title,
  blurb,
  locked,
  granted,
  onToggle,
}: {
  title: string
  blurb: string
  locked?: boolean
  granted: boolean
  onToggle?: (next: boolean) => void
}) {
  const switchId = useId()
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="flex max-w-prose flex-col gap-1">
        <div className="flex items-center gap-2">
          <label htmlFor={switchId}>
            <PUIText className="font-medium" variant="subheadline">
              {title}
            </PUIText>
          </label>
          {locked ? (
            <PUIBadge variant="outline">Always on</PUIBadge>
          ) : (
            <PUIBadge dot variant={granted ? 'success' : 'secondary'}>
              {granted ? 'Granted' : 'Off'}
            </PUIBadge>
          )}
        </div>
        <PUIText tone="muted" variant="footnote">
          {blurb}
        </PUIText>
      </div>
      <PUISwitch
        disabled={locked}
        id={switchId}
        onValueChange={onToggle}
        value={locked ? true : granted}
      />
    </div>
  )
}

function ConsentManagementDemo() {
  const { decision, gate, commit, reset } = useConsentDemo()
  const decided = isDecided(decision)

  const toggleCategory = useCallback(
    (id: Exclude<ConsentCategory, 'necessary'>, next: boolean) => {
      const current = OPTIONAL_CATEGORIES.map((entry) => entry.id).filter((category) =>
        category === id ? next : isCategoryGranted(decision, category),
      )
      commit(decideCategories(INIT, current))
    },
    [decision, commit],
  )

  const gateStatus = gate.status()
  const identifierAllowed = allowsIdentifier(decision)

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Cookie consent banner
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="subheadline">
            Necessary cookies keep the site working and need no consent. Choose what else may run,
            then save. Nothing optional loads until you decide.
          </PUIText>
        </div>

        <div className="border-border divide-border flex flex-col divide-y rounded-xl border px-5">
          <CategoryRow
            blurb="Required for core functionality, security and saving this consent decision."
            granted
            locked
            title="Necessary"
          />
          {OPTIONAL_CATEGORIES.map((category) => (
            <CategoryRow
              blurb={category.blurb}
              granted={isCategoryGranted(decision, category.id)}
              key={category.id}
              onToggle={(next) => toggleCategory(category.id, next)}
              title={category.title}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PUIButton onPress={() => commit(acceptAll(INIT))} variant="default">
            Accept all
          </PUIButton>
          <PUIButton onPress={() => commit(rejectAll(INIT))} variant="outline">
            Reject optional
          </PUIButton>
          <PUIButton
            onPress={() => commit(decideCategories(INIT, decision.categories))}
            variant="ghost"
          >
            Save my choices
          </PUIButton>
          <PUIBadge className="ml-auto" dot variant={decided ? 'success' : 'warning'}>
            {decided ? 'Decision saved' : 'Awaiting decision'}
          </PUIBadge>
        </div>

        <PUIText tone="subtle" variant="footnote">
          Read how we handle your data in our{' '}
          <PUILinkText href={PRIVACY_URL} tone="brand">
            privacy policy
          </PUILinkText>
          . You can change this any time from the footer.
        </PUIText>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <PUIText as="h3" className="tracking-tight" variant="headline">
            What runs right now
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="footnote">
            The gate reconciles every tracker against your decision without a reload. Granting
            marketing is what permits a personal identifier to leave the site.
          </PUIText>
        </div>

        <ul className="divide-border divide-y">
          {DEMO_SDKS.map((sdk) => {
            const status = gateStatus.find((entry) => entry.id === sdk.id)
            const active = status?.active ?? false
            return (
              <li className="flex items-center justify-between gap-4 py-3" key={sdk.id}>
                <div className="flex max-w-prose flex-col gap-0.5">
                  <PUIText className="font-medium" variant="subheadline">
                    {sdk.label}
                  </PUIText>
                  <PUIText tone="muted" variant="footnote">
                    {sdk.vendor}. {sdk.purpose}.
                  </PUIText>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PUIBadge variant="outline">requires {sdk.requires}</PUIBadge>
                  <PUIBadge dot variant={active ? 'success' : 'secondary'}>
                    {active ? 'Active' : 'Blocked'}
                  </PUIBadge>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="border-border flex items-center justify-between gap-4 border-t pt-4">
          <PUIText tone="muted" variant="footnote">
            Personal identifier to third parties
          </PUIText>
          <PUIBadge dot variant={identifierAllowed ? 'warning' : 'success'}>
            {identifierAllowed ? 'Permitted' : 'Blocked'}
          </PUIBadge>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <PUIText as="h3" className="tracking-tight" variant="headline">
          Persisted decision
        </PUIText>
        <PUIText className="max-w-prose" tone="muted" variant="footnote">
          The same versioned record the cookie store keeps. It survives reloads; reopening clears it
          so the banner prompts again.
        </PUIText>
        <pre className="text-foreground bg-muted overflow-x-auto rounded-lg p-4 font-mono text-xs leading-relaxed">
          <code>{JSON.stringify(decision, null, 2)}</code>
        </pre>
        <div>
          <PUIButton onPress={reset} size="sm" variant="outline">
            Reopen consent settings
          </PUIButton>
        </div>
      </section>
    </div>
  )
}

const meta = {
  title: 'Modules/Consent Management',
  component: ConsentManagementDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Bind tracking and marketing SDKs to a graded, DSGVO/TTDDG-compliant user consent that is captured, persisted and re-applied without a reload. In-memory demo: an undecided category banner (necessary / statistics / marketing) over a seeded in-memory store, plus three gated trackers (PostHog, Sentry, Meta Pixel). Toggle categories or accept/reject to watch the gate activate trackers live, see when a personal identifier becomes permitted, and reopen to clear the persisted decision.',
      },
    },
  },
} satisfies Meta<typeof ConsentManagementDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
