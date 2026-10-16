import type { Metadata, Viewport } from 'next'
import './globals.css'
import { MemberProvider } from '@/lib/member-context'
import AppShell from '@/components/app-shell'

export const metadata: Metadata = {
  title: '学习资料库',
  description: 'QQ 群成员资料共享库 + DDL 提醒',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '学习资料库',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <MemberProvider>
          <AppShell>{children}</AppShell>
        </MemberProvider>
      </body>
    </html>
  )
}