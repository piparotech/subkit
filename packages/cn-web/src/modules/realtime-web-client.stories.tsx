import { useEffect, useMemo, useRef, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIBadge, PUIButton, PUIText } from '@/components/ui'
import {
  BackoffConfig,
  type ConnectionStatus,
  type EventSourceFactory,
  type RealtimeEventSource,
  RealtimeStream,
  type ServerEvent,
  backoffDelay,
  readEvent,
} from '@/lib/realtime-web-client'

import {
  ActivityEvent,
  type ActivityPayload,
  createMockEventSourceFactory,
  mockGetToken,
} from './mock-realtime-web-client'

const backoff = BackoffConfig.parse({ baseMs: 400, maxMs: 4000 })

const STATUS: Record<
  ConnectionStatus,
  { label: string; variant: 'success' | 'warning' | 'secondary' }
> = {
  online: { label: 'Live', variant: 'success' },
  connecting: { label: 'Connecting', variant: 'warning' },
  reconnecting: { label: 'Reconnecting', variant: 'warning' },
  offline: { label: 'Offline', variant: 'secondary' },
}

type FeedItem = ActivityPayload & { seq: number }

/**
 * A factory that wraps the mock one and remembers the source it last handed the Engine, exposing a
 * `drop()` that fails it the way a real network drop would. The Engine then reconnects with backoff
 * and resumes from its last acked sequence, so the feed continues gap-free, never replayed.
 */
function createDroppableFactory(): { factory: EventSourceFactory; drop: () => void } {
  const mock = createMockEventSourceFactory()
  let active: RealtimeEventSource | null = null
  return {
    factory: (url) => {
      active = mock(url)
      return active
    },
    drop: () => active?.onerror?.(new Error('NETWORK_DROP')),
  }
}

function useRealtimeFeed() {
  const [status, setStatus] = useState<ConnectionStatus>('offline')
  const [feed, setFeed] = useState<FeedItem[]>([])
  const dropRef = useRef<() => void>(() => {})
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const { factory, drop } = createDroppableFactory()
    dropRef.current = drop
    const stream = new RealtimeStream({
      baseUrl: 'https://demo.local',
      path: '/stream',
      backoff,
      getToken: mockGetToken,
      eventSourceFactory: factory,
      onStatus: setStatus,
      onEvent: (event: ServerEvent) => {
        const activity = readEvent(event, ActivityEvent)
        if (activity) setFeed((prev) => [{ ...activity, seq: event.seq }, ...prev].slice(0, 8))
      },
    })
    stream.open()
    return () => stream.close()
  }, [generation])

  const restart = () => {
    setFeed([])
    setGeneration((value) => value + 1)
  }

  return { status, feed, drop: () => dropRef.current(), restart }
}

function RealtimeWebClientDemo() {
  const { status, feed, drop, restart } = useRealtimeFeed()
  const badge = STATUS[status]
  const firstRetry = useMemo(() => backoffDelay(0, backoff, () => 1), [])
  const lastSeq = feed[0]?.seq ?? 0

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <PUIText as="h2" className="tracking-tight" variant="title3">
              Live stream
            </PUIText>
            <PUIText className="max-w-md" tone="muted" variant="subheadline">
              An SSE EventSource driven by the connection Engine: it runs the auth handshake, then
              delivers typed, validated events. Off-schema frames are dropped, never surfaced.
            </PUIText>
          </div>
          <PUIBadge dot variant={badge.variant}>
            {badge.label}
          </PUIBadge>
        </div>

        <dl className="border-border grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1 border-y py-4">
          <dt className="text-muted-foreground text-footnote">Endpoint</dt>
          <dd className="text-foreground text-footnote justify-self-end font-mono">
            https://demo.local/stream
          </dd>
          <dt className="text-muted-foreground text-footnote">Reconnect backoff</dt>
          <dd className="text-foreground text-footnote justify-self-end">
            {backoff.baseMs}ms start (~{firstRetry}ms jittered), capped {backoff.maxMs}ms
          </dd>
          <dt className="text-muted-foreground text-footnote">Resume cursor</dt>
          <dd className="text-foreground text-footnote justify-self-end font-mono">
            after={lastSeq}
          </dd>
        </dl>

        <div className="flex flex-wrap gap-2">
          <PUIButton onPress={drop} size="sm" variant="outline">
            Drop the connection
          </PUIButton>
          <PUIButton onPress={restart} size="sm" variant="ghost">
            Restart from zero
          </PUIButton>
        </div>
        <PUIText tone="subtle" variant="footnote">
          Dropping fails the live source: the Engine backs off, reconnects with after={lastSeq} and
          resumes gap-free. Restart re-dials from the first event.
        </PUIText>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <PUIText className="font-medium" variant="subheadline">
            Activity feed
          </PUIText>
          <PUIText tone="muted" variant="footnote">
            {feed.length} of last 8
          </PUIText>
        </div>

        {feed.length === 0 ? (
          <PUIText tone="muted" variant="footnote">
            {status === 'online' ? 'Waiting for the first event …' : 'Connecting to the stream …'}
          </PUIText>
        ) : (
          <ul className="divide-border divide-y">
            {feed.map((item) => (
              <li className="flex items-center gap-4 py-2.5" key={item.seq}>
                <span className="text-muted-foreground text-footnote w-10 shrink-0 font-mono tabular-nums">
                  #{item.seq}
                </span>
                <div className="min-w-0 flex-1">
                  <PUIText className="font-medium" variant="footnote">
                    {item.actor}
                  </PUIText>
                  <PUIText className="block" tone="muted" variant="footnote">
                    {item.action}
                  </PUIText>
                </div>
                <PUIText className="shrink-0 tabular-nums" tone="subtle" variant="caption1">
                  {item.at}
                </PUIText>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PUIText className="border-border border-t pt-4" tone="subtle" variant="footnote">
        Same pure Engine the platform runs in the browser, here driven through an in-memory
        EventSource: lifecycle, backoff reconnect and resume-from-sequence with no network.
      </PUIText>
    </div>
  )
}

const meta = {
  title: 'Modules/Realtime Web Client (SSE)',
  component: RealtimeWebClientDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Feed a web app with server events in real time over Server-Sent-Events, with an encapsulated connection lifecycle, auth at the endpoint, backoff reconnect and resume from the last acknowledged sequence. In-memory demo: a deterministic EventSource emits one typed activity frame per tick. Drop the connection to watch the Engine back off and resume gap-free from its last sequence, or restart to re-dial from the first event.',
      },
    },
  },
} satisfies Meta<typeof RealtimeWebClientDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
