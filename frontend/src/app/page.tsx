'use client';

import dynamic from 'next/dynamic';
import { HeroSection } from '@/features/landing';
import { LandingModalProvider } from '@/features/landing/components/landing-modal';
import { useAnimationPreference } from '@/features/landing/hooks/use-animation-preference';

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

const AnimationToggle = dynamic(
  () => import('@/features/landing/components/animation-toggle').then((m) => m.AnimationToggle),
  { ssr: false },
);

export default function HomePage() {
  const { animationsEnabled } = useAnimationPreference();

  return (
    <LandingModalProvider>
      {/* Navigation */}
      <StickyHeader />
      <StickyFooter />
      <AnimationToggle />

      {/* Scrollable content with unified space simulation as background */}
      <div
        id="space-scroll-container"
        className="relative h-screen snap-y snap-mandatory overflow-x-hidden overflow-y-auto scroll-smooth"
      >
        {animationsEnabled && <SpaceSimulation showBlackHole maxMeteors={undefined} meteorSpawnRate={1} />}
        <HeroSection />
        <ContentSections />
      </div>
    </LandingModalProvider>
  );
}
