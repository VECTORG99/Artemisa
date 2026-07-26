'use client';

import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  /** How deeply this star dims at the bottom of its cycle — some stars
   * nearly switch off, others just dim, so the field doesn't flicker
   * uniformly. */
  offDepth: number;
}

interface Meteor {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  alpha: number;
  isRgb: boolean;
  active: boolean;
}

const STAR_COUNT = 150;
const METEOR_COUNT = 2;
// Slow global drift: the whole field creeps diagonally, like a very slow
// pan across the sky, wrapping around infinitely.
const DRIFT_SPEED_X = 0.006;
const DRIFT_SPEED_Y = 0.003;

export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Adjust for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);

    // Initialize stars (low density)
    const stars: Star[] = Array.from({ length: STAR_COUNT }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      baseAlpha: Math.random() * 0.5 + 0.15,
      twinkleSpeed: Math.random() * 0.006 + 0.002, // Slow twinkle
      twinklePhase: Math.random() * Math.PI * 2,
      offDepth: Math.random() * 0.7 + 0.3,
    }));

    // Initialize meteors pool (very subtle, occasional)
    const meteors: Meteor[] = Array.from({ length: METEOR_COUNT }).map(() => ({
      x: 0,
      y: 0,
      length: 0,
      speed: 0,
      angle: 0,
      alpha: 0,
      isRgb: false,
      active: false,
    }));

    const spawnMeteor = (meteor: Meteor) => {
      meteor.active = true;
      meteor.x = Math.random() * width * 1.5;
      meteor.y = -50;
      meteor.length = Math.random() * 70 + 35;
      // Slower fall than before (was 10-25px/frame).
      meteor.speed = Math.random() * 4 + 3;
      meteor.angle = Math.PI / 4 + (Math.random() * 0.2 - 0.1); // Roughly diagonal
      meteor.alpha = 0; // Fade in
      meteor.isRgb = Math.random() > 0.72; // ~28% chance of RGB accent
    };

    let hue = 0;
    let driftX = 0;
    let driftY = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      // Hue drifts slowly too — meteors cycle color gently, not fast.
      hue = (hue + 0.12) % 360;
      driftX = (driftX + DRIFT_SPEED_X) % width;
      driftY = (driftY + DRIFT_SPEED_Y) % height;

      // Draw stars with slow field drift + on/off flicker.
      stars.forEach((star) => {
        star.twinklePhase += star.twinkleSpeed;
        const wave = Math.sin(star.twinklePhase); // -1..1
        // Map wave to alpha so it dips close to (but not always exactly)
        // zero at the trough — a subtle "off" rather than a hard cut.
        const dip = wave < 0 ? wave * star.offDepth : wave;
        const currentAlpha = Math.max(0, star.baseAlpha * (0.15 + (dip + 1) * 0.5));

        const drawX = (star.x + driftX + width) % width;
        const drawY = (star.y + driftY + height) % height;

        if (currentAlpha < 0.02) return;

        ctx.beginPath();
        ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.fill();
      });

      // Handle meteors — rarer spawn than before.
      if (Math.random() < 0.0035) {
        const inactiveMeteor = meteors.find((m) => !m.active);
        if (inactiveMeteor) spawnMeteor(inactiveMeteor);
      }

      meteors.forEach((meteor) => {
        if (!meteor.active) return;

        // Fade in/out logic — dimmer ceiling than before (was up to 0.6).
        if (meteor.y < height / 2 && meteor.alpha < 0.32) {
          meteor.alpha += 0.02;
        } else if (meteor.y > height * 0.7) {
          meteor.alpha -= 0.02;
        }

        if (meteor.alpha <= 0 && meteor.y > height / 2) {
          meteor.active = false;
          return;
        }

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(meteor.x, meteor.y);
        ctx.lineTo(
          meteor.x - Math.cos(meteor.angle) * meteor.length,
          meteor.y - Math.sin(meteor.angle) * meteor.length,
        );

        if (meteor.isRgb) {
          const gradient = ctx.createLinearGradient(
            meteor.x,
            meteor.y,
            meteor.x - Math.cos(meteor.angle) * meteor.length,
            meteor.y - Math.sin(meteor.angle) * meteor.length,
          );
          // Lower saturation/lightness than before so the RGB tint reads as
          // a faint hint of color, not a saturated rainbow streak.
          gradient.addColorStop(0, `hsla(${hue}, 55%, 72%, ${meteor.alpha})`);
          gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, 55%, 72%, 0)`);
          ctx.strokeStyle = gradient;
        } else {
          const gradient = ctx.createLinearGradient(
            meteor.x,
            meteor.y,
            meteor.x - Math.cos(meteor.angle) * meteor.length,
            meteor.y - Math.sin(meteor.angle) * meteor.length,
          );
          gradient.addColorStop(0, `rgba(161, 161, 170, ${meteor.alpha})`); // zinc-400
          gradient.addColorStop(1, `rgba(161, 161, 170, 0)`);
          ctx.strokeStyle = gradient;
        }

        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        // Update position
        meteor.x += Math.cos(meteor.angle) * meteor.speed;
        meteor.y += Math.sin(meteor.angle) * meteor.speed;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1]"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
