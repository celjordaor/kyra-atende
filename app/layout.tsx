import type { Metadata, Viewport } from 'next';
import { Inter, DM_Mono, Roboto_Mono } from 'next/font/google';
import { SwRegister } from '@/components/organisms/SwRegister';
import CookiePreferences from '@/components/organisms/CookiePreferences';
import '@/app/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Kyra Atende',
    template: '%s — Kyra Atende',
  },
  description: 'Sistema de agendamento para pequenas e médias empresas brasileiras.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kyra',
  },
  other: {
    // Versão moderna de apple-mobile-web-app-capable (PWA padrão W3C)
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [{ url: '/brand/kyra-atende-icon.svg?v=2', type: 'image/svg+xml', sizes: 'any' }],
    shortcut: '/brand/kyra-atende-icon.svg?v=2',
    apple: [{ url: '/brand/kyra-atende-icon.svg?v=2' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#6941A5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${dmMono.variable} ${robotoMono.variable}`}
    >
      <body suppressHydrationWarning>
        <SwRegister />
        <CookiePreferences />
        {children}
      </body>
    </html>
  );
}
