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
  clusterX: number;
  radius: number;
  speed: number;
  drift: number;
  phase: number;
  alpha: number;
  cluster: boolean;
  length: number;
};

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
    const modeDensity = mode === 'rain' ? density * 0.78 : density;
    const particleCount = Math.max(36, Math.round(modeDensity * (isMobile ? 0.72 : 1)));
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const particles: SnowParticle[] = [];
    const cursor = { x: -9999, y: -9999, active: false };

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
      cursor.x = event.clientX - rect.left;
      cursor.y = event.clientY - rect.top;
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

      for (const particle of particles) {
        if (!reduceMotion) {
          particle.phase += 0.012 * delta;
          particle.y += particle.speed * delta;
          const clusterPull = particle.cluster ? (particle.clusterX - particle.x) * 0.0018 * delta : 0;
          particle.x += mode === 'rain'
            ? particle.drift * delta
            : Math.sin(particle.phase) * particle.drift * delta + clusterPull;

          if (cursor.active) {
            const dx = particle.x - cursor.x;
            const dy = particle.y - cursor.y;
            const distSq = dx * dx + dy * dy;
            const radius = 120;
            if (distSq < radius * radius && distSq > 1) {
              const force = (1 - distSq / (radius * radius)) * 2.6;
              const dist = Math.sqrt(distSq);
              particle.x += (dx / dist) * force * delta;
              particle.y += (dy / dist) * force * delta;
            }
          }

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
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          glow
        );
        gradient.addColorStop(0, `rgba(255,255,255,${particle.alpha * opacity})`);
        gradient.addColorStop(0.45, `rgba(210,238,255,${particle.alpha * 0.28 * opacity})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, glow, 0, Math.PI * 2);
        ctx.fill();
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
