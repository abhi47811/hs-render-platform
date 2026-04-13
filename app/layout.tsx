import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SentryProvider } from './sentry-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Houspire Staging',
  description: 'Internal staging operations platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SentryProvider>{children}</SentryProvider>
      </body>
    </html>
  )
}
