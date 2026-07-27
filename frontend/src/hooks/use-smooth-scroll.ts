'use client';

import { useEffect } from 'react';

/**
 * Apple-style smooth momentum scroll using lerp interpolation.
 *
 * Instead of snapping between sections, the scroll position continuously
 * eases toward a target that the user's wheel/touch input moves. This
 * produces the characteristic fluid, weighted feel of Apple product pages.
 *
 * Runs entirely on requestAnimationFrame + scrollTop assignment, so it
 * performs identically with or without GPU acceleration.
 */
export function useSmoothScroll(containerId: string) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let targetScroll = container.scrollTop;
    let currentScroll = container.scrollTop;
    let rafId = 0;
    let isRunning = false;

    // Lower = smoother/heavier, higher = snappier. 0.075 gives the Apple feel.
    const LERP = 0.075;
    // Multiplier applied to raw wheel delta — controls how far one gesture travels.
    const WHEEL_MULTIPLIER = 1.1;

    function clamp(value: number) {
      const max = container!.scrollHeight - container!.clientHeight;
      return Math.max(0, Math.min(value, max));
    }

    function animate() {
      const diff = targetScroll - currentScroll;

      // Stop the loop once we're visually settled to avoid burning frames.
      if (Math.abs(diff) < 0.1) {
        currentScroll = targetScroll;
        container!.scrollTop = currentScroll;
        isRunning = false;
        return;
      }

      currentScroll += diff * LERP;
      container!.scrollTop = currentScroll;
      rafId = requestAnimationFrame(animate);
    }

    function start() {
      if (isRunning) return;
      isRunning = true;
      rafId = requestAnimationFrame(animate);
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      targetScroll = clamp(targetScroll + event.deltaY * WHEEL_MULTIPLIER);
      start();
    }

    // Touch: track finger movement and feed it into the same target.
    let lastTouchY = 0;
    function handleTouchStart(event: TouchEvent) {
      lastTouchY = event.touches[0].clientY;
      // Sync target with wherever the native scroll left off.
      targetScroll = container!.scrollTop;
      currentScroll = container!.scrollTop;
    }

    function handleTouchMove(event: TouchEvent) {
      const y = event.touches[0].clientY;
      const delta = lastTouchY - y;
      lastTouchY = y;
      targetScroll = clamp(targetScroll + delta * 1.5);
      start();
    }

    // Keyboard and anchor jumps bypass our loop, so resync when that happens.
    function handleScroll() {
      if (!isRunning) {
        targetScroll = container!.scrollTop;
        currentScroll = container!.scrollTop;
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerId]);
}
