import type { Note, NotePage } from './contract'

/**
 * Pure, deterministic note operations — the domain core behind the API, with no I/O. They are the
 * isomorphic, node-runnable half of the backend (the backend store is a thin owner-keyed Map over
 * these), which keeps the pagination + filtering rules unit-testable offline.
 */

/** Generate a sortable, collision-resistant note id without a DB sequence. */
export function newNoteId(now: number, rand: () => number = Math.random): string {
  const stamp = now.toString(36).padStart(9, '0')
  const noise = Math.floor(rand() * 0xffffff)
    .toString(36)
    .padStart(5, '0')
  return `note_${stamp}${noise}`
}

/** Case-insensitive title/body match for the `q` filter. */
export function matchesQuery(note: Note, q: string | undefined): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  return note.title.toLowerCase().includes(needle) || note.body.toLowerCase().includes(needle)
}

/**
 * Cursor-paginate a list already sorted newest-first. The cursor is the last id of the previous
 * page (opaque to the caller). Returns at most `limit` items plus the next cursor (null on the last
 * page). Deterministic: same input → same page, so it is golden-testable.
 */
export function paginate(sorted: Note[], limit: number, cursor: string | undefined): NotePage {
  let start = 0
  if (cursor) {
    const idx = sorted.findIndex((n) => n.id === cursor)
    // An unknown cursor yields an empty tail rather than the first page — no silent wrap-around.
    start = idx === -1 ? sorted.length : idx + 1
  }
  const slice = sorted.slice(start, start + limit)
  const last = slice.at(-1)
  const hasMore = last ? start + slice.length < sorted.length : false
  return { items: slice, nextCursor: hasMore && last ? last.id : null }
}

/** Filter + sort newest-first + paginate in one pass — the exact list-route behavior. */
export function selectPage(
  notes: Note[],
  opts: { q?: string; limit: number; cursor?: string },
): NotePage {
  const filtered = notes
    .filter((n) => matchesQuery(n, opts.q))
    .sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id < b.id ? 1 : -1,
    )
  return paginate(filtered, opts.limit, opts.cursor)
}
