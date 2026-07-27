'use client';

import { useEffect, useRef } from 'react';
import { type GravityWell, gravityEffect, lensPoint, sampleDisk, sampleSecondaryImage } from '../lib/space-physics';

// ─── Config ───────────────────────────────────────────────────────────────────

const STAR_COUNT = 350;
const METEOR_COUNT = 22;
const METEOR_SPAWN_RATE = 0.12;
const CHAR_SET = ['0', '1'];
const CHAR_SPACING = 14;

// Disk tilt: how squashed the ellipse is (0 = edge-on line, 1 = face-on).
// A small non-zero tilt lets the far side peek above/below the shadow,
// like real renders of Sgr A*/M87*, without losing the edge-on silhouette.
const DISK_TILT = 0.34;
const DISK_SAMPLES = 160;
const SECONDARY_SAMPLES = 70;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Star {
  ox: number; // original x
  oy: number; // original y
  baseRadius: number;
  baseOpacity: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

interface MeteorChar {
  char: string;
  offset: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  chars: MeteorChar[];
  hue: number;
  hueSpeed: number;
  opacity: number;
  fontSize: number;
  life: number;
  maxLife: number;
  absorbed: boolean;
  stretch: number;
}

// White rings with a faint, slowly shifting RGB tint — like the meteor
// trails' hue cycling but pushed almost entirely toward white. Saturation
// stays low and lightness stays high so color is barely perceptible.
const RING_TINT_SATURATION = 30;
const RING_TINT_SPEED = 0.00006;

function ringHue(time: number, positionSeed: number): number {
  return (time * RING_TINT_SPEED * 360 + positionSeed * 47) % 360;
}

// Deterministic pseudo-random noise per "cell" index, stable across frames
// so patches of color don't flicker randomly — they only drift slowly as
// the phase offset advances.
function noiseAt(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Builds a conic gradient centered on the black hole with several color
 * stops at pseudo-random hues, so the ring reads as a slow-drifting patch
 * of faint color (a subtle "matrix" veil) instead of one uniform tint
 * shifting everywhere in sync. Each ring layer gets its own `seedOffset`
 * so different rings show different patches at the same instant.
 */
function buildNoiseGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  seedOffset: number,
  saturation: number,
  lightness: number,
  opacity: number,
): CanvasGradient | string {
  if (typeof ctx.createConicGradient !== 'function') {
    // Fallback for browsers without conic gradient support: flat tint.
    const hue = ringHue(time, seedOffset);
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`;
  }

  const stopCount = 10;
  const phase = time * RING_TINT_SPEED * Math.PI * 2;
  const gradient = ctx.createConicGradient(phase * 0.3, cx, cy);
  for (let i = 0; i <= stopCount; i++) {
    const cellSeed = seedOffset * 13.7 + i;
    // Slow drift: blend two noise samples offset in time so each patch
    // eases into the next hue instead of jumping.
    const driftA = noiseAt(cellSeed);
    const driftB = noiseAt(cellSeed + 0.5);
    const drift = driftA + (driftB - driftA) * ((Math.sin(phase + i) + 1) / 2);
    const hue = (drift * 360 + phase * 20) % 360;
    gradient.addColorStop(i / stopCount, `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`);
  }
  return gradient;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomChar() {
  return CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
}

function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function createStar(width: number, height: number): Star {
  return {
    ox: Math.random() * width,
    oy: Math.random() * height,
    baseRadius: Math.random() * 1.4 + 0.4,
    baseOpacity: Math.random() * 0.5 + 0.35,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: Math.random() * 0.0015 + 0.0006,
  };
}

function createMeteor(width: number, height: number): Meteor {
  const angle = Math.PI * 0.28 + Math.random() * 0.12;
  const speed = Math.random() * 10 + 8;
  const trailLength = Math.floor(Math.random() * 9) + 9;
  return {
    x: Math.random() * width * 1.3 - width * 0.15,
    y: -60,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    chars: Array.from({ length: trailLength }, (_, i) => ({
      char: randomChar(),
      offset: i * CHAR_SPACING,
    })),
    hue: Math.random() * 360,
    hueSpeed: Math.random() * 6 + 3,
    opacity: Math.random() * 0.35 + 0.55,
    fontSize: Math.random() * 6 + 11,
    life: 0,
    maxLife: Math.random() * 55 + 40,
    absorbed: false,
    stretch: 0,
  };
}

interface SpaceSimulationProps {
  /**
   * Global brightness multiplier for stars, disk, ring and meteors — lets
   * callers reuse the exact same simulation at a subtler intensity (e.g.
   * the Creator background) without forking the canvas logic. 1 = landing
   * page look, lower values dim everything uniformly.
   */
  intensity?: number;
  /**
   * Renders the accretion disk, photon ring and event horizon shadow.
   * Defaults to true (the Landing's look). The Creator sets this to false
   * — it disables gravitational lensing on stars and gravity/absorption on
   * meteors entirely, keeping a lightweight, calm starfield with gentle
   * meteors that fall straight without being absorbed.
   */
  showBlackHole?: boolean;
  /**
   * Maximum number of simultaneous meteors. Defaults to METEOR_COUNT (22)
   * for the landing. The Creator can pass a lower value for performance.
   */
  maxMeteors?: number;
  /**
   * Spawn rate multiplier for meteors. 1 = default (landing), lower = calmer.
   */
  meteorSpawnRate?: number;
}

export function SpaceSimulation({
  intensity = 1,
  showBlackHole = true,
  maxMeteors,
  meteorSpawnRate,
}: SpaceSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const accretionEnergyRef = useRef(0);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;
  const showBlackHoleRef = useRef(showBlackHole);
  showBlackHoleRef.current = showBlackHole;
  const maxMeteorsRef = useRef(maxMeteors ?? METEOR_COUNT);
  maxMeteorsRef.current = maxMeteors ?? METEOR_COUNT;
  const spawnRateRef = useRef(meteorSpawnRate ?? 1);
  spawnRateRef.current = meteorSpawnRate ?? 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener('resize', resize);

    // Black hole well anchored near the very top of the viewport. Sized to
    // dominate the frame like a real horizon-scale render rather than a
    // Black hole well anchored dead-center on screen. Sized to dominate
    // the frame like a real horizon-scale render rather than a small
    // decorative icon. It never moves — no scroll offset is ever applied
    // to `well`.
    const well: GravityWell = {
      x: width * 0.5,
      y: height * 0.5,
      eventRadius: Math.min(width, height) * 0.16,
      photonRadius: Math.min(width, height) * 0.205,
      influenceRadius: Math.min(width, height) * 0.75,
    };

    // Parallax scroll offset: stars and meteors drift with scroll to feel
    // like the frame is opening up more space as the user scrolls down,
    // while the black hole itself stays perfectly still on screen.
    const scrollContainer = document.getElementById('space-scroll-container');
    let scrollY = 0;
    const handleScroll = () => {
      scrollY = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
    };
    scrollContainer?.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    const STAR_PARALLAX = 0.18;
    const METEOR_PARALLAX = 0.35;
    let lastScrollY = 0;
    let scrollVelocity = 0;

    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => createStar(width, height));
    const meteors: Meteor[] = [];

    // #403: respect prefers-reduced-motion — render a single static frame
    // instead of running the animation loop. Users with motion sensitivity
    // still get the visual but without the per-frame paint cost / motion.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.fillRect(0, 0, width, height);

      // Everything drawn from here on (stars, disk, ring, meteors) is
      // scaled by `intensity` — lets callers reuse this exact simulation
      // at a subtler brightness (e.g. the Creator background) without
      // touching every individual opacity computation below.
      ctx.globalAlpha = intensityRef.current;

      // ─── Stars with gravitational lensing ──────────────────────────────
      // Stars drift downward with a fraction of scroll (parallax), wrapping
      // around infinitely in Y so the field never runs out while scrolling.
      const starOffset = scrollY * STAR_PARALLAX;
      // Light consumption is driven by active scroll *motion*, not by
      // scroll position: it spikes while the user is scrolling (up or
      // down, transitioning between phases) and decays back to 0 quickly
      // once the scroll settles, restoring the calm baseline canvas.
      const rawScrollDelta = Math.abs(scrollY - lastScrollY);
      lastScrollY = scrollY;
      scrollVelocity = Math.max(rawScrollDelta, scrollVelocity * 0.9);
      const lightConsumption = clampOpacity(scrollVelocity / 40);

      for (const star of stars) {
        star.twinklePhase += star.twinkleSpeed * 16;
        const twinkle = Math.sin(star.twinklePhase);
        const baseOp = star.baseOpacity * (0.35 + Math.abs(twinkle) * 0.65);
        const baseR = star.baseRadius * (0.75 + Math.abs(twinkle) * 0.5);

        const wrappedY = (((star.oy + starOffset) % height) + height) % height;

        // Skip lensing when black hole is hidden — straight rendering path
        if (!showBlackHoleRef.current) {
          if (baseOp < 0.02) continue;
          ctx.beginPath();
          ctx.arc(star.ox, wrappedY, baseR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${baseOp})`;
          ctx.fill();
          if (twinkle > 0.6) {
            ctx.beginPath();
            ctx.arc(star.ox, wrappedY, baseR * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${(baseOp - 0.3) * 0.12})`;
            ctx.fill();
          }
          continue;
        }

        const lensed = lensPoint({ x: star.ox, y: wrappedY }, well);

        if (!lensed.visible) continue;

        const r = baseR * (1 + lensed.tangentialStretch * 0.8);
        const nearRing = Math.min(1, lensed.tangentialStretch);
        // Ambient stars that blend faintly into the background dim further
        // while light is being actively consumed by scroll motion.
        const ambientDamp = 1 - lightConsumption * 0.55 * (1 - nearRing);
        const op = baseOp * lensed.brightness * ambientDamp;

        // How much this star has dissolved into the ring: only engages
        // near the photon band, and only while actively scrolling.
        const dissolve = nearRing * lightConsumption;

        if (dissolve > 0.05) {
          // Merge into the black hole: draw a curved arc that follows the
          // same circular geometry as the photon ring (not a straight line
          // toward the center) — as the star dissolves, the arc's radius
          // eases toward the ring's radius and its angular length grows,
          // so it reads as the star's light being smeared along the
          // horizon's curve and becoming one with the ring.
          const angle = Math.atan2(lensed.y - well.y, lensed.x - well.x);
          const starDistance = Math.hypot(lensed.x - well.x, lensed.y - well.y);
          const arcRadius = starDistance + (well.photonRadius - starDistance) * dissolve;
          const arcHalfSpan = 0.05 + dissolve * 0.5; // radians, grows as it merges
          const arcSegments = 8;
          const lineOpBase = op * (0.5 + dissolve * 1.1);
          ctx.lineCap = 'butt';

          for (let seg = 0; seg < arcSegments; seg++) {
            const t0 = seg / arcSegments;
            const t1 = (seg + 1) / arcSegments;
            // Centered on the star's angle, sweeping symmetrically.
            const a0 = angle + (t0 - 0.5) * 2 * arcHalfSpan;
            const a1 = angle + (t1 - 0.5) * 2 * arcHalfSpan;
            const sx = well.x + Math.cos(a0) * arcRadius;
            const sy = well.y + Math.sin(a0) * arcRadius;
            const ex = well.x + Math.cos(a1) * arcRadius;
            const ey = well.y + Math.sin(a1) * arcRadius;
            // Brightest at the star's own angle (t=0.5), fading toward the
            // tips of the arc so it blends smoothly into the ring.
            const edgeFade = 1 - Math.abs(t0 - 0.5) * 2;
            const segOpacity = lineOpBase * edgeFade * dissolve;
            if (segOpacity < 0.02) continue;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.strokeStyle = `rgba(255, 255, 255, ${clampOpacity(segOpacity)})`;
            ctx.lineWidth = Math.max(0.5, r * 0.5 * (0.5 + dissolve * 0.5));
            ctx.stroke();
          }

          // The star point itself shrinks and fades as it merges into the
          // arc, then grows back to full size as it exits (dissolve → 0).
          const pointOpacity = op * (1 - dissolve);
          const pointRadius = r * (1 - dissolve * 0.85);
          if (pointOpacity > 0.02 && pointRadius > 0.15) {
            ctx.beginPath();
            ctx.arc(lensed.x, lensed.y, pointRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${pointOpacity})`;
            ctx.fill();
          }
        } else {
          ctx.beginPath();
          ctx.arc(lensed.x, lensed.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${op})`;
          ctx.fill();
        }

        // Glow for bright moments
        if (twinkle > 0.6 || lensed.brightness > 1.3) {
          ctx.beginPath();
          ctx.arc(lensed.x, lensed.y, r * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${(lensed.brightness - 0.8) * 0.12})`;
          ctx.fill();
        }
      }

      // ─── Accretion disk: continuous beamed band + secondary lensed arc ─
      // Skipped entirely when `showBlackHole` is false (Creator background)
      // — stars above and meteors below still use `well` for lensing/
      // gravity, so the field keeps the same physics, just without ever
      // painting the hole itself.
      if (showBlackHoleRef.current) {
        const energy = accretionEnergyRef.current;
        const diskBrightness = 0.75 + energy * 0.55;
        const t = performance.now() * 0.00035;

        // Orbital perspective driven by scroll: as the user scrolls down it
        // feels like we are orbiting around the black hole and swinging
        // closer to it, then pulling back — the disk tilts toward face-on,
        // rotates its viewing angle, and breathes in scale, all as a
        // continuous periodic function of scroll depth (never runs out).
        const orbitPhase = scrollY * 0.0022;
        const orbitTilt = DISK_TILT + Math.sin(orbitPhase) * 0.22;
        const orbitScale = 1 + Math.sin(orbitPhase * 0.85 + 1.1) * 0.16;
        const orbitRotation = Math.sin(orbitPhase * 0.6) * 0.35;
        const orbitProximity = (Math.sin(orbitPhase + Math.PI / 2) + 1) / 2; // 0..1, 1 = closest pass
        const orbitBrightness = diskBrightness * (0.82 + orbitProximity * 0.5);

        // Draw the primary disk as a set of concentric orbits sampled densely
        // enough to read as a continuous glowing band rather than particles.
        // Layers go from wide/dim (outer disk) to narrow/bright (inner edge).
        // All layers share the same hue at a given instant so they blend into
        // one smooth band instead of showing as distinct overlapping color
        // tiers.
        //
        // Each layer is stroked as ONE continuous path (single beginPath +
        // many lineTo + a single stroke) instead of one stroke per segment.
        // Canvas re-paints alpha at every join between separate strokes, and
        // with 160 segments per layer that accumulation reads as ugly
        // overlapping "micro circles" along the ring. A single path avoids
        // that entirely; per-segment Doppler brightness is approximated with
        // one representative opacity per layer instead.
        const radiusRatios = [2.6, 2.1, 1.7, 1.35, 1.08];
        for (const ratio of radiusRatios) {
          const samples = sampleDisk(well, ratio * orbitScale, orbitTilt, t + orbitRotation, DISK_SAMPLES);

          // Representative brightness/width for this layer (average across
          // samples), so the whole ring is one flat, evenly-lit stroke.
          let avgBrightness = 0;
          let avgWidth = 0;
          for (const s of samples) {
            avgBrightness += s.brightness;
            avgWidth += s.width;
          }
          avgBrightness /= samples.length;
          avgWidth /= samples.length;

          const op = clampOpacity(avgBrightness * orbitBrightness * 0.55);
          // Fade smoothly to zero near the cutoff instead of a hard `continue`.
          // A binary skip means the faintest (outermost) ring pops in/out of
          // existence whenever `op` oscillates around the threshold — e.g. on
          // every orbital brightness cycle, or when scroll position jumps
          // (programmatic scroll-to-top), causing a visible flicker.
          const FADE_FLOOR = 0.015;
          const FADE_RANGE = 0.05;
          if (op < FADE_FLOOR) continue;
          const fadedOp = op < FADE_FLOOR + FADE_RANGE ? op * ((op - FADE_FLOOR) / FADE_RANGE) : op;

          ctx.beginPath();
          ctx.moveTo(samples[0].x, samples[0].y);
          for (let i = 1; i <= samples.length; i++) {
            const s = samples[i % samples.length];
            ctx.lineTo(s.x, s.y);
          }
          ctx.strokeStyle = buildNoiseGradient(
            ctx,
            well.x,
            well.y,
            performance.now(),
            ratio,
            RING_TINT_SATURATION,
            84,
            fadedOp,
          );
          ctx.lineWidth = avgWidth * (1 + energy * 0.6) * orbitScale;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }

        // Bright inner rim of the disk right before it plunges past the
        // photon sphere — the hottest, fastest-orbiting material. Drawn as a
        // single continuous path (see primary disk above) to avoid alpha
        // buildup at segment joins.
        const innerSamples = sampleDisk(well, 1.0 * orbitScale, orbitTilt, t + orbitRotation, DISK_SAMPLES);
        {
          let avgBrightness = 0;
          let avgWidth = 0;
          for (const s of innerSamples) {
            avgBrightness += s.brightness;
            avgWidth += s.width;
          }
          avgBrightness /= innerSamples.length;
          avgWidth /= innerSamples.length;
          const op = clampOpacity(avgBrightness * orbitBrightness * 0.85);
          if (op >= 0.02) {
            ctx.beginPath();
            ctx.moveTo(innerSamples[0].x, innerSamples[0].y);
            for (let i = 1; i <= innerSamples.length; i++) {
              const s = innerSamples[i % innerSamples.length];
              ctx.lineTo(s.x, s.y);
            }
            ctx.strokeStyle = buildNoiseGradient(
              ctx,
              well.x,
              well.y,
              performance.now(),
              5,
              RING_TINT_SATURATION,
              88,
              op,
            );
            ctx.lineWidth = avgWidth * 1.3 * (1 + energy * 0.8) * orbitScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
          }
        }

        // ─── Event horizon shadow (drawn over the far side of the disk) ───
        const shadowGrd = ctx.createRadialGradient(
          well.x,
          well.y,
          well.eventRadius * 0.6,
          well.x,
          well.y,
          well.photonRadius * 1.02,
        );
        shadowGrd.addColorStop(0, 'rgba(0,0,0,1)');
        shadowGrd.addColorStop(0.75, 'rgba(0,0,0,0.97)');
        shadowGrd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(well.x, well.y, well.photonRadius * 1.02, 0, Math.PI * 2);
        ctx.fillStyle = shadowGrd;
        ctx.fill();

        // Sharp horizon edge — the true event horizon, pure black.
        ctx.beginPath();
        ctx.arc(well.x, well.y, well.eventRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();

        // ─── Secondary (lensed) image: far side of the disk bent around the
        // photon sphere into a thin bright arc above the shadow — the
        // signature feature distinguishing a real black hole render from a
        // flat ring. Follows the same orbital perspective as the disk. Drawn
        // as a single continuous path to avoid alpha buildup at joins. ────
        const secondary = sampleSecondaryImage(well, t + orbitRotation, SECONDARY_SAMPLES);
        {
          let avgBrightness = 0;
          let avgWidth = 0;
          for (const s of secondary) {
            avgBrightness += s.brightness;
            avgWidth += s.width;
          }
          avgBrightness /= secondary.length;
          avgWidth /= secondary.length;
          const op = clampOpacity(avgBrightness * orbitBrightness * 0.7);
          if (op >= 0.015) {
            ctx.beginPath();
            ctx.moveTo(secondary[0].x, secondary[0].y);
            for (let i = 1; i < secondary.length; i++) {
              ctx.lineTo(secondary[i].x, secondary[i].y);
            }
            ctx.strokeStyle = buildNoiseGradient(
              ctx,
              well.x,
              well.y,
              performance.now(),
              11,
              RING_TINT_SATURATION,
              86,
              op,
            );
            ctx.lineWidth = avgWidth * (1 + energy * 0.6) * orbitScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
          }
        }

        // ─── Photon ring: thin, crisp, asymmetric line right at the shadow
        // boundary — brightest where the approaching disk material lenses
        // directly onto it. Radius breathes and rotates with orbital
        // perspective so it reads as swinging past the hole with the disk.
        // Drawn as a single continuous path with a fixed, fully-opaque
        // stroke color — brightness variation comes only from line width,
        // not per-segment alpha, so there is no alpha buildup at the joins.
        const ringSamples = 140;
        const ringRadius = well.photonRadius * orbitScale;
        const ringBaseOpacity = clampOpacity(0.5 + energy * 0.25);
        ctx.beginPath();
        for (let i = 0; i <= ringSamples; i++) {
          const angle = (i / ringSamples) * Math.PI * 2;
          const rx = well.x + Math.cos(angle) * ringRadius;
          const ry = well.y + Math.sin(angle) * ringRadius;
          if (i === 0) {
            ctx.moveTo(rx, ry);
          } else {
            ctx.lineTo(rx, ry);
          }
        }
        ctx.strokeStyle = buildNoiseGradient(
          ctx,
          well.x,
          well.y,
          performance.now(),
          23,
          RING_TINT_SATURATION,
          90,
          ringBaseOpacity,
        );
        ctx.lineWidth = 2 + energy * 2;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // A second, thinner pass with variable width per segment adds the
        // asymmetric "brightest where approaching" highlight on top, using a
        // single path per contiguous bright arc to avoid join artifacts.
        {
          let arcOpen = false;
          for (let i = 0; i <= ringSamples; i++) {
            const angle = (i / ringSamples) * Math.PI * 2;
            const approach = Math.cos(angle + t * 1.4 + orbitRotation);
            const bright = approach > 0.15;
            const rx = well.x + Math.cos(angle) * ringRadius;
            const ry = well.y + Math.sin(angle) * ringRadius;

            if (bright && i < ringSamples) {
              if (!arcOpen) {
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                arcOpen = true;
              } else {
                ctx.lineTo(rx, ry);
              }
            } else if (arcOpen) {
              ctx.lineTo(rx, ry);
              const op = clampOpacity((0.25 + energy * 0.3) * (0.85 + orbitProximity * 0.3));
              ctx.strokeStyle = buildNoiseGradient(
                ctx,
                well.x,
                well.y,
                performance.now(),
                31,
                RING_TINT_SATURATION,
                92,
                op,
              );
              ctx.lineWidth = 3.5 + energy * 2;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.stroke();
              arcOpen = false;
            }
          }
        }
      } // end if (showBlackHoleRef.current)

      // ─── Meteors with gravitational effects ────────────────────────────
      // Scroll adds a bit more room/energy to the field: spawn rate and
      // fall speed scale up slightly with scroll depth, so the deeper the
      // user scrolls the busier and faster the meteor shower feels — while
      // the black hole itself never moves.
      const scrollFactor = Math.min(1, scrollY / (height * 2));
      const effectiveMaxMeteors = maxMeteorsRef.current;
      const effectiveSpawnRate = METEOR_SPAWN_RATE * spawnRateRef.current;
      const dynamicSpawnRate = effectiveSpawnRate * (1 + scrollFactor * METEOR_PARALLAX);
      const dynamicMeteorCount = Math.round(effectiveMaxMeteors * (1 + scrollFactor * 0.4));
      if (meteors.length < dynamicMeteorCount && Math.random() < dynamicSpawnRate) {
        meteors.push(createMeteor(width, height));
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        let gravInfluence = 0;

        // Apply gravity only when the black hole is visible
        if (showBlackHoleRef.current) {
          const grav = gravityEffect({ x: m.x, y: m.y }, well);
          m.vx += grav.acceleration.x;
          m.vy += grav.acceleration.y;
          m.stretch = grav.tidalStretch;
          gravInfluence = grav.influence;

          if (grav.absorbed) {
            m.absorbed = true;
            accretionEnergyRef.current = Math.min(1, accretionEnergyRef.current + 0.35);
            meteors.splice(i, 1);
            continue;
          }
        } else {
          m.stretch = 0;
        }

        m.x += m.vx;
        m.y += m.vy + scrollFactor * 0.6;
        m.life++;
        m.hue = (m.hue + m.hueSpeed) % 360;

        const progress = m.life / m.maxLife;
        const fadeOut = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
        const fadeIn = progress < 0.06 ? progress / 0.06 : 1;
        const currentOpacity = m.opacity * fadeOut * fadeIn;

        if (m.life > m.maxLife || m.y > height + 100 || m.x > width + 200 || m.x < -200) {
          meteors.splice(i, 1);
          continue;
        }

        // Compute trail direction from velocity
        const speed = Math.hypot(m.vx, m.vy);
        const dirX = speed > 0 ? m.vx / speed : 0;
        const dirY = speed > 0 ? m.vy / speed : 0;

        ctx.font = `bold ${m.fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let c = 0; c < m.chars.length; c++) {
          const charData = m.chars[c];
          // Tidal stretch: chars spread out more near the horizon
          const effectiveOffset = charData.offset * (1 + m.stretch * 3);
          const cx = m.x - dirX * effectiveOffset;
          const cy = m.y - dirY * effectiveOffset;
          // Sharp, fast falloff: the trail reads as a raw digital burst that
          // dissolves into noise almost immediately instead of a smooth tail.
          const t = c / m.chars.length;
          const trailFade = Math.pow(1 - t, 3.2);
          const charOpacity = currentOpacity * trailFade;

          if (charOpacity < 0.035) continue;

          const charHue = (m.hue + c * 20) % 360;
          // Crank saturation/contrast up and keep it there — no softening
          // toward gray as gravity pulls on it, so the color stays raw.
          const saturation = 100;
          const lightness = gravInfluence > 0.5 ? 68 + gravInfluence * 22 : 62;

          if (c === 0) {
            // Tight, hard-edged glow only on the leading character — crude
            // and punchy rather than a soft diffuse blur.
            ctx.shadowColor = `hsla(${charHue}, ${saturation}%, ${lightness}%, ${charOpacity})`;
            ctx.shadowBlur = 3 + m.stretch * 6;
          } else {
            ctx.shadowBlur = 0;
          }

          // Stretch chars when under tidal forces
          if (m.stretch > 0.2) {
            ctx.save();
            ctx.translate(cx, cy);
            const stretchAngle = Math.atan2(dirY, dirX);
            ctx.rotate(stretchAngle);
            ctx.scale(1 + m.stretch * 2, 1 - m.stretch * 0.3);
            ctx.fillStyle = `hsla(${charHue}, ${saturation}%, ${lightness}%, ${charOpacity})`;
            ctx.fillText(charData.char, 0, 0);
            ctx.restore();
          } else {
            ctx.fillStyle = `hsla(${charHue}, ${saturation}%, ${lightness}%, ${charOpacity})`;
            ctx.fillText(charData.char, cx, cy);
          }

          // High glyph-flicker rate: digits keep flipping between 0/1 so the
          // trail reads as raw, busy binary noise rather than static text.
          if (Math.random() < 0.22) charData.char = randomChar();
        }
        ctx.shadowBlur = 0;
      }

      // Decay accretion energy over time
      accretionEnergyRef.current = Math.max(0, accretionEnergyRef.current - 0.004);

      animRef.current = requestAnimationFrame(animate);
    };

    // #403: pause the animation when the tab is hidden to save CPU/GPU;
    // resume on visibilitychange. Reduced-motion users get one static frame.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animRef.current);
      } else if (!prefersReducedMotion && isIntersecting) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // #580: pause the animation when the canvas scrolls out of viewport via
    // IntersectionObserver. This complements (does not replace) the
    // visibilitychange handler above. Reduced-motion users get one static
    // frame on (re)entry instead of resuming the loop.
    let isIntersecting = true;
    const onIntersect: IntersectionObserverCallback = (entries) => {
      const entry = entries[0];
      if (!entry) return;
      isIntersecting = entry.isIntersecting;
      if (!isIntersecting) {
        cancelAnimationFrame(animRef.current);
      } else if (prefersReducedMotion) {
        // Render a single static frame; no RAF loop.
        animate();
        cancelAnimationFrame(animRef.current);
      } else {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    const intersectionObserver =
      typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(onIntersect, { threshold: 0 }) : null;
    intersectionObserver?.observe(canvas);

    if (prefersReducedMotion) {
      // Render a single frame; no RAF loop.
      animate();
      cancelAnimationFrame(animRef.current);
    } else {
      animate();
    }

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      scrollContainer?.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      intersectionObserver?.disconnect();
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[1] h-screen w-screen" aria-hidden="true" />
  );
}
