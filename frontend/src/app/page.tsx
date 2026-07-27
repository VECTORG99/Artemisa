'use client';

import dynamic from 'next/dynamic';
import { HeroSection } from '@/features/landing';
import { LandingModalProvider } from '@/features/landing/components/landing-modal';

const SpaceSimulation = dynamic(
  () => import('@/features/landing/components/space-simulation').then((m) => m.SpaceSimulation),
  { ssr: false },
);

const StickyHeader = dynamic(() => import('@/features/landing/components/sticky-nav').then((m) => m.StickyHeader), {
  ssr: false,
});

const StickyFooter = dynamic(() => import('@/features/landing/components/sticky-nav').then((m) => m.StickyFooter), {
  ssr: false,
});

const ContentSections = dynamic(
  () => import('@/features/landing/components/content-sections').then((m) => m.ContentSections),
  { ssr: false },
);

export default function HomePage() {
  return (
    <LandingModalProvider>
      {/* Skip link for keyboard/screen reader users (#563) */}
      <a
        href="#contenido-principal"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[100] focus-visible:rounded-full focus-visible:border focus-visible:border-white/10 focus-visible:bg-zinc-900/90 focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-white focus-visible:shadow-lg focus-visible:backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        Saltar al contenido
      </a>

      {/* Navigation */}
      <StickyHeader />
      <StickyFooter />

      {/* Scrollable content with unified space simulation as background */}
      <div
        id="space-scroll-container"
        className="relative h-screen snap-y snap-mandatory overflow-x-hidden overflow-y-auto scroll-smooth"
      >
        {/* The simulation renders the black hole + stars + meteors as a
            fixed full-viewport canvas (see space-simulation.tsx) so the
            black hole stays anchored on screen while stars/meteors keep
            falling infinitely as the user scrolls down. */}
        <SpaceSimulation />
        <HeroSection />
        <ContentSections />
      </div>
    </LandingModalProvider>
  );
}
