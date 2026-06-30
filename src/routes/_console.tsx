import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { getAuthStatus, getSubscriptionConsoleData } from '~/features/subscription-console/server'

export const Route = createFileRoute('/_console')({
  beforeLoad: async () => {
    const status = await getAuthStatus()

    if (!status.authenticated) {
      // TanStack Router redirects are Response objects by design.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ search: { reason: 'auth_required' }, to: '/login' })
    }
  },
  component: Outlet,
  loader: async () => getSubscriptionConsoleData(),
})
