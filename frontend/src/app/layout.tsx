import type { Metadata } from 'next';
import '@/styles/globals.css';

const siteUrl = 'https://huascar.vercel.app';

export const metadata: Metadata = {
  title: 'Huascar — Creador de Agentes',
  description:
    'Diseña agentes de desarrollo y operación mediante un árbol de decisiones, genera su configuración y entiende por qué fue construida así.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Huascar — Creador de Agentes',
    description:
      'Diseña agentes de desarrollo y operación mediante un árbol de decisiones, genera su configuración y entiende por qué fue construida así.',
    type: 'website',
    url: siteUrl,
    siteName: 'Huascar',
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: 'Huascar — Creador de Agentes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Huascar — Creador de Agentes',
    description:
      'Diseña agentes de desarrollo y operación mediante un árbol de decisiones, genera su configuración y entiende por qué fue construida así.',
    images: [`${siteUrl}/og-image.png`],
  },
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="h-screen overflow-hidden bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
