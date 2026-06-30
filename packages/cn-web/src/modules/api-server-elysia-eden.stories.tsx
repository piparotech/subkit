import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  PUIBadge,
  PUIButton,
  PUIInput,
  PUISegmentedControl,
  PUIText,
  PUITextArea,
} from '@/components/ui'
import { ApiError, type Note, parseCreateNoteInput } from '@/lib/api-server-elysia-eden'

import {
  type AuthMode,
  DEMO_CONFIG,
  createMockApiClient,
  openApiDocument,
} from './mock-api-server-elysia-eden'

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** One persisted note, with the delete action wired to the typed route. */
function NoteRow({
  note,
  onDelete,
  busy,
}: {
  note: Note
  onDelete: (id: string) => void
  busy: boolean
}) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <PUIText className="truncate font-medium" variant="callout">
          {note.title}
        </PUIText>
        {note.body ? (
          <PUIText className="max-w-prose truncate" tone="muted" variant="footnote">
            {note.body}
          </PUIText>
        ) : null}
        <PUIText className="font-mono" tone="subtle" variant="caption2">
          {note.id} · {timeLabel(note.createdAt)}
        </PUIText>
      </div>
      <PUIButton disabled={busy} onPress={() => onDelete(note.id)} size="sm" variant="ghost">
        Delete
      </PUIButton>
    </li>
  )
}

const AUTH_OPTIONS: { value: AuthMode; label: string }[] = [
  { value: 'authenticated', label: 'Authenticated' },
  { value: 'unauthenticated', label: 'No token' },
]

function ApiServerDemo() {
  const [authMode, setAuthMode] = useState<AuthMode>('authenticated')
  const client = useMemo(() => createMockApiClient(DEMO_CONFIG, authMode), [authMode])

  const [notes, setNotes] = useState<Note[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const titleResult = parseCreateNoteInput({ title, body: body || undefined })
  const titleError =
    title.length > 0 && !titleResult.success
      ? (titleResult.error.issues.find((issue) => issue.path[0] === 'title')?.message ??
        'Invalid title')
      : null

  const describeError = useCallback((error: unknown): string => {
    if (error instanceof ApiError) return `${error.status} ${error.code}`
    return 'Unexpected error'
  }, [])

  const load = useCallback(
    async (append: boolean) => {
      setLoading(true)
      setRequestError(null)
      try {
        const page = await client.listNotes({
          ...(append && cursor ? { cursor } : {}),
          ...(search.trim() ? { q: search.trim() } : {}),
        })
        setNotes((prev) => (append ? [...prev, ...page.items] : page.items))
        setCursor(page.nextCursor)
      } catch (error) {
        setRequestError(describeError(error))
        if (!append) setNotes([])
      } finally {
        setLoading(false)
      }
    },
    [client, cursor, search, describeError],
  )

  // Reload the first page whenever the client (auth mode) or the active search term changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reactive refetch through shared load(); its leading setLoading/setRequestError must stay synchronous for the button callers
    void load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, search])

  async function onCreate() {
    if (!titleResult.success) return
    setMutating(true)
    setRequestError(null)
    try {
      await client.createNote(titleResult.data)
      setTitle('')
      setBody('')
      await load(false)
    } catch (error) {
      setRequestError(describeError(error))
    } finally {
      setMutating(false)
    }
  }

  async function onDelete(id: string) {
    setMutating(true)
    setRequestError(null)
    try {
      await client.deleteNote(id)
      await load(false)
    } catch (error) {
      setRequestError(describeError(error))
    } finally {
      setMutating(false)
    }
  }

  const spec = openApiDocument(DEMO_CONFIG)
  const routes = useMemo(
    () =>
      Object.entries(spec.paths).flatMap(([path, methods]) =>
        Object.entries(methods).map(([method, op]) => ({
          path,
          method: method.toUpperCase(),
          summary: op.summary,
        })),
      ),
    [spec],
  )

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Notes API
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="subheadline">
            A typed, owner-scoped resource served by the Elysia backend. Input is validated against
            the shared contract before any handler runs, errors map to one consistent status, and
            the same pure core paginates here as on the server.
          </PUIText>
        </div>

        <div className="flex flex-col gap-2">
          <PUIText className="font-medium" variant="footnote">
            Bearer token
          </PUIText>
          <PUISegmentedControl
            onValueChange={(value) => setAuthMode(value as AuthMode)}
            options={AUTH_OPTIONS}
            value={authMode}
          />
          <PUIText className="max-w-prose" tone="subtle" variant="caption1">
            The client never owns auth state. Drop the token to see every route reject with 401
            INVALID_TOKEN.
          </PUIText>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void onCreate()
          }}
        >
          <PUIText className="font-medium" variant="footnote">
            Create note
          </PUIText>
          <PUIInput
            error={titleError}
            label="Title"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Required, up to 120 characters"
            value={title}
          />
          <PUITextArea
            hint="Optional free text."
            label="Body"
            onChange={(event) => setBody(event.target.value)}
            placeholder="Optional"
            rows={3}
            value={body}
          />
          <PUIButton disabled={!titleResult.success} fullWidth loading={mutating} type="submit">
            Create note
          </PUIButton>
        </form>

        <div className="flex flex-col gap-3">
          <PUIText className="font-medium" variant="footnote">
            OpenAPI contract
          </PUIText>
          <div className="flex items-center justify-between gap-3">
            <PUIText className="font-mono" tone="muted" variant="caption2">
              {spec.info.title}
            </PUIText>
            <PUIBadge variant="outline">v{spec.info.version}</PUIBadge>
          </div>
          <ul className="flex flex-col gap-1.5">
            {routes.map((route) => (
              <li className="flex items-center gap-2" key={`${route.method} ${route.path}`}>
                <PUIBadge variant="secondary">{route.method}</PUIBadge>
                <PUIText className="font-mono" tone="muted" variant="caption2">
                  {route.path}
                </PUIText>
                <PUIText className="ml-auto" tone="subtle" variant="caption2">
                  {route.summary}
                </PUIText>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <PUIText as="h2" className="tracking-tight" variant="headline">
              GET /notes
            </PUIText>
            <PUIText tone="subtle" variant="caption1">
              Page size {DEMO_CONFIG.pagination.defaultLimit}, capped at{' '}
              {DEMO_CONFIG.pagination.maxLimit}. Newest first.
            </PUIText>
          </div>
          <div className="w-56 shrink-0">
            <PUIInput
              aria-label="Search notes"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter (q)"
              value={search}
            />
          </div>
        </div>

        {requestError ? (
          <div className="border-destructive/40 bg-destructive/5 rounded-lg border px-4 py-3">
            <PUIText className="text-destructive font-mono" variant="footnote">
              {requestError}
            </PUIText>
          </div>
        ) : null}

        {notes.length > 0 ? (
          <ul className="divide-border divide-y">
            {notes.map((note) => (
              <NoteRow busy={mutating} key={note.id} note={note} onDelete={onDelete} />
            ))}
          </ul>
        ) : !loading && !requestError ? (
          <PUIText tone="muted" variant="callout">
            No notes match this query.
          </PUIText>
        ) : null}

        <div className="flex items-center gap-3">
          <PUIButton
            disabled={cursor === null || loading}
            loading={loading && notes.length > 0}
            onPress={() => void load(true)}
            variant="outline"
          >
            {cursor === null ? 'No more pages' : 'Load next page'}
          </PUIButton>
          <PUIText className="font-mono" tone="subtle" variant="caption2">
            {notes.length} loaded
            {cursor ? ` · cursor ${cursor}` : ''}
          </PUIText>
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: 'Modules/API Server (Elysia + Eden)',
  component: ApiServerDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Type-safe HTTP endpoints served by Elysia: schema-validated routes, an end-to-end typed Eden bridge to the client, and a generated OpenAPI contract that mirrors the live validation, with errors mapped consistently onto status codes. In-memory demo: an owner inbox of six seeded notes runs on the pure list core. Create a note to watch contract validation reject a blank or over-long title, drop the bearer token to make every route fail with 401, search and page through the capped result set, and delete a row to exercise the error to status mapping.',
      },
    },
  },
} satisfies Meta<typeof ApiServerDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
