// In-memory seam for the profile-basic Engine: a deterministic mock `fetch` standing in for the
// platform's `/profile` backend (GET own master data, PUT a partial update, DELETE the account).
// The Engine is injected with this fetch, so the real isomorphic client runs unchanged — Bearer
// attach, schema re-validation, typed ProfileError — with no network and no database. The store is
// authoritative: it re-validates every PUT, so a bad payload returns the same VALIDATION_FAILED the
// server would. Seeded data mirrors the auth mock (Demo Operator) so both showcases tell one story.
import { type ProfileData, type ProfileUpdate, parseProfileUpdate } from '@/lib/profile-basic'

/** The injected backend base the Engine prefixes its `/profile` path with (never actually reached). */
export const MOCK_BASE_URL = 'https://api.piparo.local'

/** A static Bearer the demo Shell hands the Engine; the mock treats it as the signed-in session. */
export const SEEDED_TOKEN = 'demo-access-token'

/** Deterministic seeded profile — the row a returning Demo Operator reads back on first open. */
export const SEEDED_PROFILE: ProfileData = {
  displayName: 'Demo Operator',
  bio: 'Operations lead at piparo. Ships the platform, mentors the team, runs the on-call rotation.',
  locale: 'de-DE',
  avatarUrl: null,
}

type JsonBody = Record<string, unknown>

function json(status: number, body: JsonBody): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * A stateful in-memory `fetch` for the seeded `/profile` route. It rejects calls without the seeded
 * Bearer (UNAUTHENTICATED), serves the current row on GET, authoritatively re-validates and merges
 * partial updates on PUT (VALIDATION_FAILED on a bad payload), and tombstones the account on DELETE
 * so a subsequent read is rejected (ACCOUNT_DELETED) — the GDPR self-service path, end to end.
 */
export function createMockProfileFetch(): typeof fetch {
  let profile: ProfileData = { ...SEEDED_PROFILE }
  let deleted = false

  return async (input, init) => {
    const url = typeof input === 'string' ? input : input.toString()
    const path = url.replace(MOCK_BASE_URL, '')
    const headers = new Headers(init?.headers)
    const bearer = headers.get('authorization')?.replace(/^Bearer\s+/i, '')

    if (path !== '/profile') return json(404, { code: 'NOT_FOUND' })
    if (bearer !== SEEDED_TOKEN) return json(401, { code: 'UNAUTHENTICATED' })
    if (deleted) return json(410, { code: 'ACCOUNT_DELETED' })

    switch (init?.method) {
      case undefined:
      case 'GET':
        return json(200, profile)

      case 'PUT': {
        const parsed = parseProfileUpdate(JSON.parse(String(init?.body ?? '{}')))
        if (!parsed.success) return json(422, { code: 'VALIDATION_FAILED' })
        profile = { ...profile, ...stripUndefined(parsed.data) }
        return json(200, profile)
      }

      case 'DELETE':
        deleted = true
        return new Response(null, { status: 204 })

      default:
        return json(405, { code: 'METHOD_NOT_ALLOWED' })
    }
  }
}

/** Drop keys the partial payload left undefined so they don't overwrite the stored row. */
function stripUndefined(patch: ProfileUpdate): Partial<ProfileData> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<ProfileData>
}
