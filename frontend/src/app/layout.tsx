import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AAQA - Automatic Announcement Quality Analyzer',
  description: 'AI-powered evaluation of public announcement audio quality.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
