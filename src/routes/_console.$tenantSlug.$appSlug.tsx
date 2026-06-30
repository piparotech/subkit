import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug')({
  component: Outlet,
})
