import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  PUIBadge,
  PUIButton,
  PUIEmptyState,
  PUIProgressBar,
  PUISegmentedControl,
  PUIText,
} from '@/components/ui'
import { UploadError, type UploadObject, checkPolicy } from '@/lib/object-storage-uploads'

import { createMockUploadEnvironment } from './mock-object-storage-uploads'

/** A picker entry standing in for a file chosen from disk: declared metadata plus dummy bytes. */
type SampleFile = {
  id: string
  label: string
  filename: string
  contentType: string
  size: number
}

const SAMPLE_FILES: SampleFile[] = [
  {
    id: 'receipt',
    label: 'Beleg.jpg',
    filename: 'Beleg.jpg',
    contentType: 'image/jpeg',
    size: 312_000,
  },
  {
    id: 'contract',
    label: 'Vertrag.pdf',
    filename: 'Vertrag.pdf',
    contentType: 'application/pdf',
    size: 1_240_000,
  },
  {
    id: 'oversized',
    label: 'Video.pdf',
    filename: 'Rohscan.pdf',
    contentType: 'application/pdf',
    size: 8_400_000,
  },
  {
    id: 'wrongtype',
    label: 'Daten.zip',
    filename: 'Export.zip',
    contentType: 'application/zip',
    size: 64_000,
  },
]

type PolicyViolation = NonNullable<ReturnType<typeof checkPolicy>>

const POLICY_REASON = {
  FILE_TOO_LARGE: 'Exceeds the 5 MB size limit, rejected before any URL is issued.',
  CONTENT_TYPE_NOT_ALLOWED: 'Type not in the allow list, rejected before any URL is issued.',
} satisfies Record<PolicyViolation, string>

function policyReason(code: string): string | null {
  return code in POLICY_REASON ? POLICY_REASON[code as keyof typeof POLICY_REASON] : null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Deterministic dummy bytes so an "upload" has real content to PUT to the in-memory store. */
function bodyFor(file: SampleFile): Uint8Array {
  return new Uint8Array(file.size)
}

function statusBadge(object: UploadObject) {
  return object.status === 'completed' ? (
    <PUIBadge dot variant="success">
      stored
    </PUIBadge>
  ) : (
    <PUIBadge dot variant="warning">
      pending
    </PUIBadge>
  )
}

function ObjectStorageUploadsDemo() {
  const { client, config } = useMemo(() => createMockUploadEnvironment(), [])

  const [objects, setObjects] = useState<UploadObject[]>([])
  const [selectedId, setSelectedId] = useState<string>(SAMPLE_FILES[0]?.id ?? '')
  const [progress, setProgress] = useState<number | null>(null)
  const [grantedUrl, setGrantedUrl] = useState<{ id: string; url: string } | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const refresh = useCallback(async () => setObjects(await client.list()), [client])

  useEffect(() => {
    void client.list().then(setObjects)
  }, [client])

  const selected = useMemo(() => SAMPLE_FILES.find((file) => file.id === selectedId), [selectedId])

  const policyError = selected
    ? checkPolicy(config.limits, { contentType: selected.contentType, size: selected.size })
    : null

  const onSelect = useCallback((id: string) => {
    setSelectedId(id)
    setNotice(null)
  }, [])

  /** Runs the production client end to end: grant, direct PUT, confirm. `clientKey` makes it idempotent. */
  const upload = useCallback(
    async (file: SampleFile) => {
      setProgress(0)
      setNotice(null)
      setGrantedUrl(null)
      try {
        const object = await client.upload({
          filename: file.filename,
          contentType: file.contentType,
          body: bodyFor(file),
          clientKey: `sample:${file.id}`,
          onProgress: setProgress,
        })
        await refresh()
        setNotice({
          tone: 'ok',
          text: `Stored ${object.filename} via a presigned PUT, direct to storage.`,
        })
      } catch (cause) {
        const code = cause instanceof UploadError ? cause.code : 'UPLOAD_FAILED'
        setNotice({ tone: 'error', text: policyReason(code) ?? `Upload failed: ${code}.` })
      } finally {
        setProgress(null)
      }
    },
    [client, refresh],
  )

  const grantDownload = useCallback(
    async (object: UploadObject) => {
      const grant = await client.downloadUrl(object.id)
      setGrantedUrl({ id: object.id, url: grant.url })
    },
    [client],
  )

  const remove = useCallback(
    async (object: UploadObject) => {
      await client.remove(object.id)
      setGrantedUrl((current) => (current?.id === object.id ? null : current))
      await refresh()
    },
    [client, refresh],
  )

  const sweepOrphans = useCallback(async () => {
    const removed = await client.cleanupOrphans()
    await refresh()
    setNotice({
      tone: 'ok',
      text:
        removed > 0
          ? `Swept ${removed} stale pending ${removed === 1 ? 'orphan' : 'orphans'}.`
          : 'No stale orphans to sweep.',
    })
  }, [client, refresh])

  const pendingCount = objects.filter((object) => object.status === 'pending').length

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Upload a file
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="subheadline">
            Pick a file, then the client asks the server for a short-lived presigned URL and streams
            the bytes straight to storage. The server re-checks the size and type policy before it
            grants anything, so a violation never produces a URL.
          </PUIText>
        </div>

        <div className="flex flex-col gap-2">
          <PUIText as="label" className="font-medium" variant="footnote">
            File
          </PUIText>
          <PUISegmentedControl
            onValueChange={onSelect}
            options={SAMPLE_FILES.map((file) => ({ value: file.id, label: file.label }))}
            value={selectedId}
          />
          {selected ? (
            <PUIText className="font-mono" tone="subtle" variant="caption2">
              {selected.contentType} · {formatBytes(selected.size)}
            </PUIText>
          ) : null}
        </div>

        {policyError ? (
          <PUIText className="text-destructive max-w-prose" variant="caption1">
            {POLICY_REASON[policyError]}
          </PUIText>
        ) : null}

        {progress !== null ? (
          <PUIProgressBar label="Uploading direct to storage" value={progress * 100} />
        ) : null}

        <PUIButton
          disabled={!selected}
          fullWidth
          loading={progress !== null}
          onPress={() => selected && void upload(selected)}
        >
          {policyError ? 'Try upload (will be rejected)' : 'Upload'}
        </PUIButton>

        {notice ? (
          <PUIText
            className={notice.tone === 'error' ? 'text-destructive' : 'text-success'}
            variant="caption1"
          >
            {notice.text}
          </PUIText>
        ) : null}

        <PUIText className="max-w-prose" tone="subtle" variant="caption1">
          Re-uploading the same file reuses its idempotency key, so an interrupted upload is retried
          into the same object instead of duplicating it.
        </PUIText>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <PUIText as="h2" className="tracking-tight" variant="headline">
            Your files
          </PUIText>
          <PUIButton
            disabled={pendingCount === 0}
            onPress={() => void sweepOrphans()}
            size="sm"
            variant="outline"
          >
            Sweep orphans
          </PUIButton>
        </div>

        {objects.length === 0 ? (
          <PUIEmptyState
            description="Upload a file to see it listed here with a presigned download on demand."
            title="No files yet"
          />
        ) : (
          <ul className="divide-border divide-y">
            {objects.map((object) => (
              <li className="flex flex-col gap-2 py-4 first:pt-0" key={object.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <PUIText className="truncate font-medium" variant="callout">
                        {object.filename}
                      </PUIText>
                      {statusBadge(object)}
                    </div>
                    <PUIText className="font-mono" tone="subtle" variant="caption2">
                      {object.contentType} · {formatBytes(object.size)} · {object.storageKey}
                    </PUIText>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {object.status === 'completed' ? (
                      <PUIButton
                        onPress={() => void grantDownload(object)}
                        size="sm"
                        variant="ghost"
                      >
                        Get link
                      </PUIButton>
                    ) : null}
                    <PUIButton onPress={() => void remove(object)} size="sm" variant="ghost">
                      Delete
                    </PUIButton>
                  </div>
                </div>
                {grantedUrl?.id === object.id ? (
                  <PUIText className="text-primary font-mono break-all" variant="caption2">
                    {grantedUrl.url}
                  </PUIText>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <PUIText className="max-w-prose" tone="subtle" variant="caption1">
          A file is only ever read through a fresh, expiring presigned link, never a standing URL.
          The seeded pending row is an aborted upload older than the cleanup window: sweep it to
          reclaim it.
        </PUIText>
      </section>
    </div>
  )
}

const meta = {
  title: 'Modules/Object Storage & Uploads',
  component: ObjectStorageUploadsDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Store and serve files reliably in S3-compatible object storage: a presigned-URL flow for direct up and download past the app server, owner-scoped access and type, size and retry handling, on the isomorphic object-storage-uploads Engine. In-memory demo: one owner is seeded with two stored files and one stale pending orphan. Try uploading the image or PDF and watch progress run through grant, direct PUT and confirm; try the oversized PDF or the zip to see the policy reject it before any URL is issued; request a presigned download link, delete a file, or sweep the orphan.',
      },
    },
  },
} satisfies Meta<typeof ObjectStorageUploadsDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
