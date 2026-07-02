import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: ({ error }) => <RouteErrorState error={error} />,
    defaultNotFoundComponent: () => <RouteNotFoundState />,
    defaultPendingComponent: () => <RoutePendingState />,
    scrollRestoration: true,
  })
}

function RouteErrorState({ error }: { error: unknown }) {
  return (
    <main role="alert">
      <h1>SubKit could not load this view</h1>
      <p>{readErrorMessage(error) ?? 'An unexpected error occurred. Please retry the action.'}</p>
    </main>
  )
}

function RouteNotFoundState() {
  return (
    <main>
      <h1>View not found</h1>
      <p>The requested SubKit console view does not exist or is no longer available.</p>
    </main>
  )
}

function RoutePendingState() {
  return (
    <main aria-busy="true" aria-live="polite">
      <p>Loading SubKit…</p>
    </main>
  )
}

function readErrorMessage(error: unknown): string | null {
  if (error instanceof Error) return error.message
  return null
}
