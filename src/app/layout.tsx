import type { Metadata, Viewport } from 'next'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { DemoModeProvider } from '@/lib/demoMode'
import DemoModeBanner from '@/components/DemoModeBanner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Steward',
  description: 'Track and manage your stewardship behaviors and accountability',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Steward',
  },
}

// Next 16 moved themeColor out of metadata and into viewport — keeping it
// in metadata produced "Unsupported metadata themeColor" warnings on every
// page build. Same value, just the right place.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Let content extend into the iOS safe areas so the top suite bar's
  // safe-area-inset-top padding actually reserves space behind the status bar.
  viewportFit: 'cover',
  themeColor: '#2563EB',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <LanguageProvider>
          <DemoModeProvider>
            <DemoModeBanner />
            {children}
          </DemoModeProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
