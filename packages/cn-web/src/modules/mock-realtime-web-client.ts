// In-memory seam for the realtime-web-client Engine — the injected `eventSourceFactory` + `getToken`
// — so the SSE state machine runs fully offline in the showcase (no EventSource, no server, no
// network). The fake source performs the real choreography: it reads the resume cursor from the
// handshake URL, defers `onopen`, then pushes deterministic `activity` frames on a fixed cadence,
// each carrying a strictly-monotonic `seq` STRICTLY AFTER that cursor. So tearing a source down and
// re-dialing resumes exactly where it left off — the resume-from-sequence guarantee, visible. The
// activity items mirror the native realtime-websocket mock so both showcases tell the same story.
import {
  EVENT_NAME,
  type EventSourceFactory,
  RESUME_PARAM,
  type RealtimeEventSource,
  type ServerEvent,
  defineEvent,
  encodeServerEvent,
} from '@/lib/realtime-web-client'
import { z } from 'zod'

/** The demo's single typed domain channel: a live activity feed item. */
export const ActivityEvent = defineEvent(
  'activity',
  z.object({
    actor: z.string().min(1),
    action: z.string().min(1),
    at: z.string().min(1),
  }),
)
export type ActivityPayload = ReturnType<typeof ActivityEvent.parse>

/** A deterministic ring of activity items pushed one per tick (loops so the feed never runs dry). */
const ACTIVITY: ActivityPayload[] = [
  { actor: 'Mira', action: 'hat eine Bestellung aufgegeben', at: '09:41' },
  { actor: 'Jonas', action: 'ist dem Team beigetreten', at: '09:42' },
  { actor: 'Amal', action: 'hat ein Dokument freigegeben', at: '09:43' },
  { actor: 'Lena', action: 'hat einen Kommentar hinterlassen', at: '09:44' },
  { actor: 'Tariq', action: 'hat den Status geändert', at: '09:45' },
]

/** A fixed demo token so the handshake passes deterministically — never a real credential. */
export const mockGetToken = (): string => 'demo-realtime-token'

function readResumeCursor(url: string): number {
  const after = new URL(url).searchParams.get(RESUME_PARAM)
  const seq = after == null ? 0 : Number(after)
  return Number.isInteger(seq) && seq > 0 ? seq : 0
}

/**
 * An in-memory `EventSourceFactory` for the Engine. Every produced source opens after a short delay,
 * then emits one canned activity frame every `eventEveryMs`, each `seq` continuing strictly after the
 * resume cursor parsed from the handshake URL. Timing uses small real timers (well under a second) so
 * the live feel is visible without any network.
 */
export function createMockEventSourceFactory(eventEveryMs = 1600): EventSourceFactory {
  return (url) => {
    let open = true
    let seq = readResumeCursor(url)
    const listeners: ((event: { data: string }) => void)[] = []
    const timers: ReturnType<typeof setTimeout>[] = []

    const source: RealtimeEventSource = {
      onopen: null,
      onerror: null,
      addEventListener(type, listener) {
        if (type === EVENT_NAME) listeners.push(listener)
      },
      close() {
        if (!open) return
        open = false
        for (const handle of timers) clearTimeout(handle)
        timers.length = 0
      },
    }

    const pushActivity = () => {
      if (!open) return
      seq += 1
      const event: ServerEvent = {
        seq,
        channel: ActivityEvent.channel,
        payload: ACTIVITY[(seq - 1) % ACTIVITY.length],
      }
      const data = encodeServerEvent(event)
      for (const listener of listeners) listener({ data })
      timers.push(setTimeout(pushActivity, eventEveryMs))
    }

    // Defer the open so the consumer can attach handlers first (mirrors a real async connect).
    timers.push(
      setTimeout(() => {
        if (!open) return
        source.onopen?.()
        timers.push(setTimeout(pushActivity, eventEveryMs))
      }, 250),
    )

    return source
  }
}
