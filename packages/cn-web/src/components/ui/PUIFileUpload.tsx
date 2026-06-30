import * as React from 'react'

import { File as FileIcon, Upload, X } from 'lucide-react'

import { cn } from '../../lib/utils'
import { type PUIFileUploadItem, type PUIFileUploadOwnProps } from './PUIFileUpload.types'
import { PUIText } from './PUIText'

export type {
  PUIFileUploadItem,
  PUIFileUploadOwnProps,
  PUIFileUploadStatus,
} from './PUIFileUpload.types'

const STATUS_LABEL: Record<NonNullable<PUIFileUploadItem['status']>, string> = {
  uploading: 'Uploading',
  done: 'Done',
  error: 'Error',
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

/** Human-readable byte size (binary steps), e.g. `1.4 MB`. */
function formatSize(bytes: number): string {
  if (bytes < 1) return '0 B'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1)
  const unit = UNITS[exponent] ?? 'B'
  const value = bytes / 1024 ** exponent
  const rounded = exponent === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${unit}`
}

/**
 * Middle-truncate a file name: keep the head and the tail, collapse the middle to `…`, so the
 * extension and the start both survive. Returns the original when it already fits within `max`.
 */
function middleTruncate(name: string, max = 28): string {
  if (name.length <= max) return name
  const keep = max - 1
  const head = Math.ceil(keep / 2)
  const tail = Math.floor(keep / 2)
  return `${name.slice(0, head)}…${name.slice(name.length - tail)}`
}

/** The secondary caption for a settled or in-flight row: error message, status, or formatted size. */
function describeFile(file: PUIFileUploadItem): string {
  if (file.status === 'error') return file.error ?? STATUS_LABEL.error
  if (file.size != null) return formatSize(file.size)
  if (file.status != null) return STATUS_LABEL[file.status]
  return ''
}

/** Does `file` match the `accept` filter (extensions, MIME types, wildcards, or empty = all). */
function matchesAccept(file: File, accept: string | undefined): boolean {
  if (accept == null || accept.trim() === '') return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return accept
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) => {
      if (entry.startsWith('.')) return name.endsWith(entry)
      if (entry.endsWith('/*')) return type.startsWith(entry.slice(0, entry.length - 1))
      return type === entry
    })
}

function toItem(file: File): PUIFileUploadItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    size: file.size,
    file,
  }
}

/**
 * Web file-upload field: a label/hint, a real drag-and-drop drop zone (a labelled, keyboard-focusable
 * button that also accepts `dragover`/`drop`), a hidden `<input type="file">` it triggers on
 * click/Enter/Space, and a list of selected files with size and a remove control. `accept` and
 * `maxSize` are enforced on both the drop and the picker, surfacing rejected files through an inline
 * `role="alert"` message. Controlled via `value`/`onChange`. Tokens only, no side-stripe.
 *
 * Border precedence on the zone follows PUIInput: error > drag-active ring > default.
 *
 * @scope web-only
 */
export const PUIFileUpload = React.forwardRef<HTMLInputElement, PUIFileUploadOwnProps>(
  function PUIFileUpload(
    {
      value,
      onChange,
      label,
      hint,
      accept,
      multiple = false,
      maxSize,
      disabled = false,
      error = false,
      className,
    },
    ref,
  ) {
    const reactId = React.useId()
    const inputId = `${reactId}-input`
    const labelId = `${reactId}-label`
    const promptId = `${reactId}-prompt`
    const errorId = `${reactId}-error`
    const hintId = `${reactId}-hint`

    const inputRef = React.useRef<HTMLInputElement>(null)
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    const [dragActive, setDragActive] = React.useState(false)
    const [rejection, setRejection] = React.useState<string | null>(null)

    const externalError = error !== false && error != null
    const errorNode = typeof error === 'boolean' ? null : error
    const inlineError = rejection ?? errorNode
    const invalid = externalError || rejection != null
    const describedby =
      [hint != null ? hintId : null, inlineError != null ? errorId : null]
        .filter(Boolean)
        .join(' ') || undefined

    const ingest = (files: FileList | File[]) => {
      const incoming = Array.from(files)
      if (incoming.length === 0) return

      const rejected: string[] = []
      const accepted: File[] = []
      for (const file of incoming) {
        if (!matchesAccept(file, accept)) {
          rejected.push(`${file.name} is not an accepted file type`)
        } else if (maxSize != null && file.size > maxSize) {
          rejected.push(`${file.name} is larger than ${formatSize(maxSize)}`)
        } else {
          accepted.push(file)
        }
      }

      setRejection(rejected.length > 0 ? rejected.join('. ') : null)

      if (accepted.length === 0) return
      const items = accepted.map(toItem)
      const next = multiple ? [...value, ...items] : items.slice(0, 1)
      onChange?.(next)
    }

    const handleRemove = (id: string) => {
      setRejection(null)
      onChange?.(value.filter((item) => item.id !== id))
    }

    const openPicker = () => {
      if (disabled) return
      inputRef.current?.click()
    }

    return (
      <div className={cn('flex flex-col gap-2 self-stretch', className)}>
        {label != null ? (
          <PUIText className="block font-medium" id={labelId} variant="subheadline">
            {label}
          </PUIText>
        ) : null}
        {hint != null ? (
          <PUIText className="block" id={hintId} tone="muted" variant="footnote">
            {hint}
          </PUIText>
        ) : null}

        <input
          ref={inputRef}
          accept={accept}
          aria-hidden
          className="sr-only"
          disabled={disabled}
          id={inputId}
          multiple={multiple}
          onChange={(event) => {
            ingest(event.target.files ?? [])
            event.target.value = ''
          }}
          tabIndex={-1}
          type="file"
        />

        <button
          aria-describedby={describedby}
          aria-disabled={disabled || undefined}
          aria-invalid={invalid || undefined}
          aria-labelledby={`${label != null ? `${labelId} ` : ''}${promptId}`}
          className={cn(
            'bg-muted flex min-h-[44px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors motion-reduce:transition-none',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            invalid
              ? 'border-destructive'
              : dragActive
                ? 'border-ring bg-accent'
                : 'border-border hover:bg-accent',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          disabled={disabled}
          onClick={openPicker}
          onDragLeave={(event) => {
            event.preventDefault()
            setDragActive(false)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            if (!disabled) setDragActive(true)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setDragActive(false)
            if (!disabled) ingest(event.dataTransfer.files)
          }}
          type="button"
        >
          <Upload aria-hidden className="text-muted-foreground size-6" />
          <PUIText className="font-medium" id={promptId} variant="subheadline">
            Drag and drop or browse
          </PUIText>
          <PUIText tone="muted" variant="caption1">
            {hint ?? (accept != null ? accept : 'Any file type')}
          </PUIText>
        </button>

        {inlineError != null ? (
          <p id={errorId} role="alert">
            <PUIText className="text-destructive" variant="footnote">
              {inlineError}
            </PUIText>
          </p>
        ) : null}

        {value.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {value.map((item) => (
              <FileRow item={item} key={item.id} onRemove={handleRemove} />
            ))}
          </ul>
        ) : null}
      </div>
    )
  },
)
PUIFileUpload.displayName = 'PUIFileUpload'

function FileRow({ item, onRemove }: { item: PUIFileUploadItem; onRemove: (id: string) => void }) {
  const isError = item.status === 'error'
  const isUploading = item.status === 'uploading'
  const caption = describeFile(item)
  const progress = Math.max(0, Math.min(100, item.progress ?? 0))

  return (
    <li className="border-border bg-background flex items-center gap-3 rounded-lg border px-3 py-2">
      <FileIcon aria-hidden className="text-muted-foreground size-5 shrink-0" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <PUIText className="truncate" title={item.name} variant="subheadline">
          {middleTruncate(item.name)}
        </PUIText>
        {caption.length > 0 ? (
          <PUIText
            className={cn('truncate', isError && 'text-destructive')}
            tone={isError ? 'default' : 'muted'}
            variant="caption1"
          >
            {caption}
          </PUIText>
        ) : null}
        {isUploading ? (
          <div
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="bg-muted mt-1 h-1 overflow-hidden rounded-full"
            role="progressbar"
          >
            <div
              className="bg-primary h-full rounded-full transition-[width] motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </div>

      <button
        aria-label={`Remove ${item.name}`}
        className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        onClick={() => onRemove(item.id)}
        type="button"
      >
        <X aria-hidden className="size-4" />
      </button>
    </li>
  )
}
