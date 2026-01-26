import type { Metadata } from 'next'
import { Providers } from './Provider'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Labor Management System',
  description: 'Manage labor operations in Bangladesh',
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}