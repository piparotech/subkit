import { type ReactNode } from 'react'

export type PUIFileUploadStatus = 'uploading' | 'done' | 'error'

export interface PUIFileUploadItem {
  /** Stable identity for list keys and the `onChange`/remove callbacks. */
  id: string
  /** Display name; middle-truncated in the row so head and tail stay readable. */
  name: string
  /** Byte size; formatted into a human-readable string when present. */
  size?: number
  /** Upload progress 0–100; drives the track width while `status === 'uploading'`. */
  progress?: number
  /** Per-file lifecycle. Omitted reads as a settled, sizes-only row. */
  status?: PUIFileUploadStatus
  /** Failure message shown (in the destructive tone) when `status === 'error'`. */
  error?: string
  /** The browser File this item was created from, when picked through the zone. */
  file?: File
}

export interface PUIFileUploadOwnProps {
  /** The selected files (controlled). Each carries its own progress/status. */
  value: PUIFileUploadItem[]
  /** Fired with the next file list after a pick or a remove. */
  onChange?: (files: PUIFileUploadItem[]) => void
  /** Optional field label rendered above the zone (`subheadline`). */
  label?: ReactNode
  /** Optional helper text under the label and echoed as the zone's secondary line. */
  hint?: ReactNode
  /**
   * Accept filter, forwarded to the hidden input's `accept` and enforced on drop.
   * A comma list of extensions (`.pdf`), MIME types (`image/png`), or wildcards (`image/*`).
   */
  accept?: string
  /** Allow selecting more than one file. When false, a new pick replaces the list. */
  multiple?: boolean
  /** Reject any file larger than this many bytes with an inline error. */
  maxSize?: number
  /** Dims and disables the zone and the hidden input (rows stay readable). */
  disabled?: boolean
  /**
   * Force a validation error. `true` shows the destructive border with no message;
   * a node renders as the inline `role="alert"` text. Internal accept/size rejections
   * surface the same way and win for the duration of the rejection.
   */
  error?: boolean | ReactNode
  /** Extra classes for the outer container (layout/spacing). */
  className?: string
}
