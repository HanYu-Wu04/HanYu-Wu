import { useEffect, useRef } from 'react';

export type ParticleWeatherMode = 'snow' | 'rain';

interface SnowfallCanvasProps {
  className?: string;
  density?: number;
  opacity?: number;
  mode?: ParticleWeatherMode;
}

type SnowParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  clusterX: number;
  radius: number;
  speed: number;
  drift: number;
  phase: number;
  alpha: number;
  cluster: boolean;
  length: number;
};

type SnowSprite = {
  canvas: HTMLCanvasElement;
  size: number;
};

function createSnowSprite(glow: number): SnowSprite {
  const size = Math.ceil(glow * 2 + 4);
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const spriteCtx = sprite.getContext('2d');

  if (spriteCtx) {
    const center = size / 2;
    const gradient = spriteCtx.createRadialGradient(center, center, 0, center, center, glow);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.45, 'rgba(210,238,255,0.28)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    spriteCtx.fillStyle = gradient;
    spriteCtx.beginPath();
    spriteCtx.arc(center, center, glow, 0, Math.PI * 2);
    spriteCtx.fill();
  }

  return { canvas: sprite, size };
}

function getSnowSprite(sprites: SnowSprite[], glow: number) {
  return sprites.reduce((closest, sprite) => (
    Math.abs(sprite.size - glow * 2) < Math.abs(closest.size - glow * 2) ? sprite : closest
  ), sprites[0]);
}

function createParticle(
  width: number,
  height: number,
  mode: ParticleWeatherMode,
  startAtTop = false
): SnowParticle {
  const cluster = mode === 'snow' && Math.random() < 0.42;
  const clusterX = Math.random() * width;
  return {
    x: cluster ? clusterX + (Math.random() - 0.5) * 74 : Math.random() * width,
    y: startAtTop ? -24 - Math.random() * height * 0.24 : Math.random() * height,
    vx: 0,
    vy: 0,
    clusterX,
    radius: mode === 'rain' ? 0.7 + Math.random() * 0.7 : cluster ? 0.65 + Math.random() * 1.7 : 0.8 + Math.random() * 2.6,
    speed: mode === 'rain' ? 7.8 + Math.random() * 5.8 : 0.28 + Math.random() * 0.72,
    drift: mode === 'rain' ? -1.9 - Math.random() * 1.8 : 0.18 + Math.random() * 0.42,
    phase: Math.random() * Math.PI * 2,
    alpha: mode === 'rain' ? 0.28 + Math.random() * 0.38 : cluster ? 0.26 + Math.random() * 0.34 : 0.34 + Math.random() * 0.52,
    cluster,
    length: mode === 'rain' ? 12 + Math.random() * 24 : 0,
  };
}

export default function SnowfallCanvas({
  className = '',
  density = 72,
  opacity = 1,
  mode = 'snow',
}: SnowfallCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const modeDensity = mode === 'rain' ? density * 0.78 : density;
    const mobileScale = mode === 'snow' ? 0.56 : 0.72;
    const rawParticleCount = Math.round(modeDensity * (isMobile ? mobileScale : 1));
    const mobileCap = mode === 'snow' ? 280 : 420;
    const desktopCap = mode === 'snow' ? 620 : 520;
    const particleCount = Math.max(36, Math.min(rawParticleCount, isMobile ? mobileCap : desktopCap));
    const dpr = Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1 : 1.5);
    const particles: SnowParticle[] = [];
    const snowSprites = mode === 'snow'
      ? [2.4, 3.4, 4.8, 6.4, 8.2, 10.2].map(createSnowSprite)
      : [];
    const cursor = {
      x: -9999,
      y: -9999,
      prevX: -9999,
      prevY: -9999,
      vx: 0,
      vy: 0,
      active: false,
    };

    let width = 1;
    let height = 1;
    let animationId = 0;
    let lastTime = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles.length = 0;
      for (let i = 0; i < particleCount; i += 1) {
        particles.push(createParticle(width, height, mode));
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;
      cursor.vx = cursor.active ? nextX - cursor.x : 0;
      cursor.vy = cursor.active ? nextY - cursor.y : 0;
      cursor.prevX = cursor.x;
      cursor.prevY = cursor.y;
      cursor.x = nextX;
      cursor.y = nextY;
      cursor.active = true;
    };

    const onPointerLeave = () => {
      cursor.active = false;
    };

    const draw = (now: number) => {
      const delta = Math.min(2.4, (now - lastTime) / 16.67);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      if (cursor.active && !reduceMotion) {
        const cursorSpeed = Math.min(1, Math.hypot(cursor.vx, cursor.vy) / 42);
        if (cursorSpeed > 0.08) {
          const pressureRadius = mode === 'rain' ? 88 : 72;
          const pressure = ctx.createRadialGradient(
            cursor.x,
            cursor.y,
            0,
            cursor.x,
            cursor.y,
            pressureRadius
          );
          pressure.addColorStop(0, `rgba(180,230,255,${0.12 * cursorSpeed * opacity})`);
          pressure.addColorStop(0.48, `rgba(120,205,245,${0.055 * cursorSpeed * opacity})`);
          pressure.addColorStop(1, 'rgba(120,205,245,0)');
          ctx.fillStyle = pressure;
          ctx.beginPath();
          ctx.arc(cursor.x, cursor.y, pressureRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const particle of particles) {
        if (!reduceMotion) {
          particle.phase += 0.012 * delta;
          particle.y += particle.speed * delta;
          const clusterPull = particle.cluster ? (particle.clusterX - particle.x) * 0.0018 * delta : 0;
          const naturalDrift = mode === 'rain'
            ? particle.drift * delta
            : Math.sin(particle.phase) * particle.drift * delta + clusterPull;
          particle.x += naturalDrift;

          if (cursor.active) {
            const dx = particle.x - cursor.x;
            const dy = particle.y - cursor.y;
            const distSq = dx * dx + dy * dy;
            const cursorSpeed = Math.min(1, Math.hypot(cursor.vx, cursor.vy) / 42);
            const radius = mode === 'rain' ? 260 : 230;
            if (distSq < radius * radius && distSq > 1) {
              const proximity = 1 - distSq / (radius * radius);
              const force = proximity * proximity * (mode === 'rain' ? 1.28 : 0.96) * (1 + cursorSpeed * 1.85);
              const dist = Math.sqrt(distSq);
              const nx = dx / dist;
              const ny = dy / dist;
              const wake = mode === 'rain' ? 0.48 : 0.36;
              const twist = (mode === 'rain' ? 2.8 : 2.15) * proximity * (0.35 + cursorSpeed);
              particle.vx += nx * force + cursor.vx * proximity * wake - ny * twist;
              particle.vy += ny * force + cursor.vy * proximity * wake + nx * twist;
            }
          }

          const drag = mode === 'rain' ? 0.88 : 0.92;
          particle.vx *= Math.pow(drag, delta);
          particle.vy *= Math.pow(drag, delta);
          particle.x += particle.vx * delta;
          particle.y += particle.vy * delta;

          if (particle.y > height + 16 || particle.x < -24 || particle.x > width + 24) {
            Object.assign(particle, createParticle(width, height, mode, true));
          }
        }

        if (mode === 'rain') {
          ctx.strokeStyle = `rgba(190,225,245,${particle.alpha * opacity})`;
          ctx.lineWidth = particle.radius;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(particle.x + particle.drift * 2.2, particle.y + particle.length);
          ctx.stroke();
          continue;
        }

        const glow = particle.radius * (particle.cluster ? 2.35 : 3.0);
        const sprite = getSnowSprite(snowSprites, glow);
        ctx.globalAlpha = particle.alpha * opacity;
        ctx.drawImage(
          sprite.canvas,
          particle.x - sprite.size / 2,
          particle.y - sprite.size / 2,
          sprite.size,
          sprite.size
        );
        ctx.globalAlpha = 1;
      }

      ctx.globalCompositeOperation = 'source-over';
      animationId = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);
    animationId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [density, opacity, mode]);

  return (
    <canvas
      ref={canvasRef}
      className={`block h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
}
