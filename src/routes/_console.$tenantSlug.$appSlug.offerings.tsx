import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console/AppRouteView'
import { OfferingsView } from '~/domain/offerings/OfferingsView'
import { consoleRouteData, type AppConsoleViewRenderProps } from '~/console/views'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/offerings')({
  component: OfferingsRoute,
  staticData: consoleRouteData('offerings'),
})

function OfferingsRoute() {
  return <AppRouteView renderView={renderOfferingsView} />
}

function renderOfferingsView({ offerings }: AppConsoleViewRenderProps) {
  return <OfferingsView offerings={offerings} />
}
