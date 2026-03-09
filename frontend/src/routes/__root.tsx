import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
  Link,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ConvexClientProvider } from '../convex'
import { AuthProvider } from '../contexts/AuthContext'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'CivicRise – AI Copilot for Montgomery Citizens',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  component: () => (
    <RootDocument>
      <Outlet />
      <TanStackRouterDevtools />
    </RootDocument>
  ),

  notFoundComponent: () => (
    <RootDocument>
      <NotFound />
      <TanStackRouterDevtools />
    </RootDocument>
  ),
})

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Page not found</h1>
      <p className="text-gray-600 dark:text-gray-400">The page you’re looking for doesn’t exist.</p>
      <Link to="/" className="text-civic-orange hover:underline font-medium">
        Back to home
      </Link>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <ConvexClientProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ConvexClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
