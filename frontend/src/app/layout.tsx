import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import { AnimationPreferenceProvider } from '@/features/landing/hooks/use-animation-preference';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://huascar.vercel.app';

export const metadata: Metadata = {
  title: 'Huascar — Generador de Configuración de Agentes',
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
    title: 'Huascar — Generador de Configuración de Agentes',
    description:
      'Genera archivos de configuración para agentes de desarrollo y operación mediante un árbol de decisiones explicables. Sin ejecutar, sin desplegar, sin caja negra.',
    type: 'website',
    url: siteUrl,
    siteName: 'Huascar',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Huascar — Generador de Configuración de Agentes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Huascar — Generador de Configuración de Agentes',
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
        <AnimationPreferenceProvider>{children}</AnimationPreferenceProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
