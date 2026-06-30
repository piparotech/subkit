import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // TanStack Router redirects are Response objects by design.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: '/apps' })
  },
})
