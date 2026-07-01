import { createFileRoute } from '@tanstack/react-router'

import { LoginPage } from '~/features/subkit/LoginPage'
import { getAuthStatus } from '~/features/subkit/server'

interface LoginSearch {
  reason?: string
}

export const Route = createFileRoute('/login')({
  component: LoginRoute,
  loader: async () => getAuthStatus(),
  validateSearch: validateLoginSearch,
})

function LoginRoute() {
  Route.useLoaderData()
  const search = Route.useSearch()
  return <LoginPage reason={loginReasonText(search.reason)} />
}

function validateLoginSearch(search: Record<string, unknown>): LoginSearch {
  return { reason: typeof search.reason === 'string' ? search.reason : undefined }
}

function loginReasonText(reason: string | undefined): string | undefined {
  switch (reason) {
    case 'auth_required':
      return 'Please sign in to open SubKit.'
    case 'callback_failed':
    case 'expired':
    case 'invalid_state':
    case 'oidc_error':
      return 'The sign-in could not be completed. Please try again.'
    case 'logged_out':
      return 'You have been signed out.'
    default:
      return undefined
  }
}
