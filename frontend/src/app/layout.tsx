import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import { AnimationPreferenceProvider } from '@/features/landing/hooks/use-animation-preference';
import { LanguageToggle } from '@/features/landing/components/language-toggle';
import { LocaleProvider } from '@/i18n';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://artemisa-ai.netlify.app';

export const metadata: Metadata = {
  title: 'Artemisa — Generador de Configuración de Agentes',
  description:
    'Genera archivos de configuración para agentes de desarrollo y operación mediante un árbol de decisiones explicables. Sin ejecutar, sin desplegar, sin caja negra.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: '/apple-touch-icon.png',
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'Artemisa — Generador de Configuración de Agentes',
    description:
      'Genera archivos de configuración para agentes de desarrollo y operación mediante un árbol de decisiones explicables. Sin ejecutar, sin desplegar, sin caja negra.',
    type: 'website',
    url: siteUrl,
    siteName: 'Artemisa',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Artemisa — Generador de Configuración de Agentes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Artemisa — Generador de Configuración de Agentes',
    description:
      'Genera archivos de configuración para agentes de desarrollo y operación mediante un árbol de decisiones explicables. Sin ejecutar, sin desplegar, sin caja negra.',
    images: [`${siteUrl}/og-image.png`],
  },
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`dark ${inter.variable}`}>
      <body className="font-sans bg-zinc-950 text-zinc-100 antialiased">
        <LocaleProvider>
          <AnimationPreferenceProvider>
            {children}
            <LanguageToggle />
          </AnimationPreferenceProvider>
        </LocaleProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
