import { createFileRoute, redirect } from '@tanstack/react-router'

import { SubscriptionConsole } from '~/features/subscription-console/SubscriptionConsole'
import { getAuthStatus, getSubscriptionConsoleData } from '~/features/subscription-console/server'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const status = await getAuthStatus()

    if (!status.authenticated) {
      // TanStack Router redirects are Response objects by design.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ search: { reason: 'auth_required' }, to: '/login' })
    }
  },
  component: SubscriptionConsole,
  loader: async () => getSubscriptionConsoleData(),
})
