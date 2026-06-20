import { useEffect, useRef } from 'react';

type CursorParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  radius: number;
  life: number;
  maxLife: number;
  spin: number;
  alpha: number;
};

const PARTICLE_COLOR = '14, 165, 233';
const HIGHLIGHT_COLOR = '220, 248, 255';

export default function FluidCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const canvas = canvasRef.current;
    if (!canvas || reduceMotion || coarsePointer) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const particles: CursorParticle[] = [];
    const cursor = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      prevX: window.innerWidth / 2,
      prevY: window.innerHeight / 2,
      active: false,
    };

    let width = 1;
    let height = 1;
    let dpr = 1;
    let animationId = 0;
    let lastTime = performance.now();

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
    };

    const addParticle = (x: number, y: number, vx: number, vy: number, speed: number, spread = 1) => {
      const baseRadius = 14 + Math.min(26, speed * 0.16) + Math.random() * 10;
      particles.push({
        x,
        y,
        vx: vx * 0.012 + (Math.random() - 0.5) * 0.9 * spread,
        vy: vy * 0.012 + (Math.random() - 0.5) * 0.9 * spread,
        baseRadius,
        radius: baseRadius,
        life: 0,
        maxLife: 900 + Math.random() * 520,
        spin: (Math.random() - 0.5) * 0.018,
        alpha: 0.42 + Math.random() * 0.18,
      });

      if (particles.length > 118) {
        particles.splice(0, particles.length - 118);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const nextX = event.clientX;
      const nextY = event.clientY;
      const vx = cursor.active ? nextX - cursor.x : 0;
      const vy = cursor.active ? nextY - cursor.y : 0;
      const speed = Math.hypot(vx, vy);

      cursor.prevX = cursor.x;
      cursor.prevY = cursor.y;
      cursor.x = nextX;
      cursor.y = nextY;
      cursor.active = true;

      const steps = Math.max(1, Math.min(4, Math.ceil(speed / 28)));
      for (let i = 0; i < steps; i += 1) {
        const t = steps === 1 ? 1 : i / (steps - 1);
        const x = cursor.prevX + vx * t;
        const y = cursor.prevY + vy * t;
        addParticle(x, y, vx, vy, speed);

        if (speed > 10) {
          const dist = Math.max(1, speed);
          const normalX = -vy / dist;
          const normalY = vx / dist;
          const offset = 10 + Math.min(22, speed * 0.16);
          addParticle(x + normalX * offset, y + normalY * offset, vx * 0.45, vy * 0.45, speed, 1.25);
          addParticle(x - normalX * offset, y - normalY * offset, vx * 0.45, vy * 0.45, speed, 1.25);
        }
      }
    };

    const onPointerLeave = () => {
      cursor.active = false;
    };

    const drawParticle = (particle: CursorParticle, opacity: number) => {
      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.radius
      );
      gradient.addColorStop(0, `rgba(${HIGHLIGHT_COLOR}, ${0.28 * opacity})`);
      gradient.addColorStop(0.28, `rgba(${PARTICLE_COLOR}, ${0.24 * opacity})`);
      gradient.addColorStop(0.64, `rgba(${PARTICLE_COLOR}, ${0.09 * opacity})`);
      gradient.addColorStop(1, `rgba(${PARTICLE_COLOR}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = (now: number) => {
      const deltaMs = Math.min(40, now - lastTime);
      const delta = deltaMs / 16.67;
      lastTime = now;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.075)';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.life += deltaMs;
        particle.vx += Math.sin((particle.life + particle.x) * 0.006) * particle.spin * delta;
        particle.vy += Math.cos((particle.life + particle.y) * 0.006) * particle.spin * delta;
        particle.vx *= Math.pow(0.982, delta);
        particle.vy *= Math.pow(0.982, delta);
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;

        const progress = particle.life / particle.maxLife;
        if (progress >= 1) {
          particles.splice(i, 1);
          continue;
        }

        const opacity = Math.pow(1 - progress, 1.2) * particle.alpha;
        particle.radius = particle.baseRadius * (1 + progress * 2.65);
        drawParticle(particle, opacity);
      }

      if (cursor.active) {
        const pulse = 0.72 + Math.sin(now * 0.009) * 0.12;
        const core = ctx.createRadialGradient(cursor.x, cursor.y, 0, cursor.x, cursor.y, 32);
        core.addColorStop(0, `rgba(${HIGHLIGHT_COLOR}, ${0.36 * pulse})`);
        core.addColorStop(0.42, `rgba(${PARTICLE_COLOR}, ${0.24 * pulse})`);
        core.addColorStop(1, `rgba(${PARTICLE_COLOR}, 0)`);
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 32, 0, Math.PI * 2);
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[115] pointer-events-none mix-blend-screen blur-[1px]"
      aria-hidden="true"
    />
  );
}
