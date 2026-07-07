import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console/AppRouteView'
import { OfferingsView } from '~/domain/offerings/OfferingsView'
import type { AppConsoleViewRenderProps } from '~/console/types'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/offerings')({
  component: OfferingsRoute,
})

function OfferingsRoute() {
  return <AppRouteView title="Offerings" renderView={renderOfferingsView} />
}

function renderOfferingsView({ offerings }: AppConsoleViewRenderProps) {
  return <OfferingsView offerings={offerings} />
}
