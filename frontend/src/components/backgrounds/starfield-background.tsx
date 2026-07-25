'use client';

import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
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
    const stars: Star[] = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      baseAlpha: Math.random() * 0.5 + 0.1,
      twinkleSpeed: Math.random() * 0.01 + 0.005, // Slow twinkle
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    // Initialize meteors pool (very subtle, occasional)
    const meteors: Meteor[] = Array.from({ length: 2 }).map(() => ({
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
      meteor.length = Math.random() * 80 + 40;
      meteor.speed = Math.random() * 15 + 10;
      meteor.angle = Math.PI / 4 + (Math.random() * 0.2 - 0.1); // Roughly diagonal
      meteor.alpha = 0; // Fade in
      meteor.isRgb = Math.random() > 0.8; // 20% chance of RGB accent
    };

    let hue = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      hue = (hue + 0.5) % 360;

      // Draw stars
      stars.forEach((star) => {
        star.twinklePhase += star.twinkleSpeed;
        const currentAlpha = star.baseAlpha + Math.sin(star.twinklePhase) * 0.3;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, currentAlpha)})`;
        ctx.fill();
      });

      // Handle meteors
      if (Math.random() < 0.005) {
        // 0.5% chance per frame to spawn
        const inactiveMeteor = meteors.find((m) => !m.active);
        if (inactiveMeteor) spawnMeteor(inactiveMeteor);
      }

      meteors.forEach((meteor) => {
        if (!meteor.active) return;

        // Fade in/out logic
        if (meteor.y < height / 2 && meteor.alpha < 0.6) {
          meteor.alpha += 0.05;
        } else if (meteor.y > height * 0.7) {
          meteor.alpha -= 0.05;
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
          gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${meteor.alpha})`);
          gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, 100%, 70%, 0)`);
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

        ctx.lineWidth = 1.5;
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
      className="fixed inset-0 pointer-events-none z-[-1] bg-zinc-950"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
