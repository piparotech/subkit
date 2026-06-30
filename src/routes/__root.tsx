/// <reference types="vite/client" />
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { ThemeProvider } from '@piparo/cn-web'
import * as React from 'react'

import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        name: 'description',
        content: 'Multi-tenant subscription management console for app stores and subscriber lifecycle operations.',
      },
      { title: 'SubKit' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider className="min-h-dvh" scheme="light">
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
