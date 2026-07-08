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
    <main className="grid min-h-dvh place-items-center bg-[var(--subkit-bg)] p-[24px]" role="alert">
      <section className="w-[min(560px,100%)] rounded-[16px] border border-[color-mix(in_oklch,var(--subkit-red)_28%,var(--subkit-border))] bg-[var(--subkit-panel)] p-[22px] shadow-[0_12px_32px_-20px_rgba(20,20,50,0.28)]">
        <p className="mb-[6px] font-mono text-[11px] font-semibold tracking-[0.06em] text-[var(--subkit-red)] uppercase">
          Console error
        </p>
        <h1 className="m-0 text-[22px] font-bold text-[var(--subkit-text)]">
          SubKit could not load this view
        </h1>
        <p className="mt-[10px] mb-0 text-[13.5px] leading-[1.5] text-[var(--subkit-dim)]">
          {readErrorMessage(error) ??
            'An unexpected error occurred. Retry the action or reload the console.'}
        </p>
      </section>
    </main>
  )
}

function RouteNotFoundState() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--subkit-bg)] p-[24px]">
      <section className="w-[min(520px,100%)] rounded-[16px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] p-[22px] shadow-[0_12px_32px_-20px_rgba(20,20,50,0.28)]">
        <p className="mb-[6px] font-mono text-[11px] font-semibold tracking-[0.06em] text-[var(--subkit-faint)] uppercase">
          Not found
        </p>
        <h1 className="m-0 text-[22px] font-bold text-[var(--subkit-text)]">View not found</h1>
        <p className="mt-[10px] mb-0 text-[13.5px] leading-[1.5] text-[var(--subkit-dim)]">
          The requested SubKit console view does not exist or is no longer available.
        </p>
      </section>
    </main>
  )
}

function RoutePendingState() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="grid min-h-dvh place-items-center bg-[var(--subkit-bg)] p-[24px]"
    >
      <div className="rounded-[999px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[14px] py-[9px] text-[13px] text-[var(--subkit-dim)] shadow-[0_10px_24px_-18px_rgba(20,20,50,0.24)]">
        Loading SubKit…
      </div>
    </main>
  )
}

function readErrorMessage(error: unknown): string | null {
  if (error instanceof Error) return error.message
  return null
}
