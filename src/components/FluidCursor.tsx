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
  stretch: number;
  angle: number;
};

const PARTICLE_COLOR = '14, 165, 233';
const HIGHLIGHT_COLOR = '220, 248, 255';
const MAX_PARTICLES = 96;

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
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2,
      prevX: window.innerWidth / 2,
      prevY: window.innerHeight / 2,
      vx: 0,
      vy: 0,
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
      const baseRadius = 6 + Math.min(15, speed * 0.075) + Math.random() * 6;
      particles.push({
        x,
        y,
        vx: vx * 0.018 + (Math.random() - 0.5) * 1.15 * spread,
        vy: vy * 0.018 + (Math.random() - 0.5) * 1.15 * spread,
        baseRadius,
        radius: baseRadius,
        life: 0,
        maxLife: 720 + Math.random() * 460,
        spin: (Math.random() - 0.5) * 0.026,
        alpha: 0.14 + Math.random() * 0.1,
        stretch: 1 + Math.min(1.25, speed / 115),
        angle: Math.atan2(vy, vx),
      });

      if (particles.length > MAX_PARTICLES) {
        particles.splice(0, particles.length - MAX_PARTICLES);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const nextX = event.clientX;
      const nextY = event.clientY;
      const vx = cursor.active ? nextX - cursor.targetX : 0;
      const vy = cursor.active ? nextY - cursor.targetY : 0;
      const speed = Math.hypot(vx, vy);

      cursor.targetX = nextX;
      cursor.targetY = nextY;
      cursor.vx = vx;
      cursor.vy = vy;
      cursor.active = true;

      const steps = Math.max(1, Math.min(8, Math.ceil(speed / 18)));
      for (let i = 0; i < steps; i += 1) {
        const t = (i + 1) / steps;
        const x = cursor.x + (nextX - cursor.x) * t;
        const y = cursor.y + (nextY - cursor.y) * t;
        const wobble = Math.sin((performance.now() + i * 47) * 0.018) * Math.min(12, speed * 0.08);
        const dist = Math.max(1, speed);
        const normalX = -vy / dist;
        const normalY = vx / dist;
        addParticle(x + normalX * wobble, y + normalY * wobble, vx, vy, speed);

        if (speed > 16 && i % 2 === 0) {
          const offset = 7 + Math.min(18, speed * 0.1);
          addParticle(x + normalX * offset, y + normalY * offset, vx * 0.35, vy * 0.35, speed, 1.4);
          addParticle(x - normalX * offset, y - normalY * offset, vx * 0.35, vy * 0.35, speed, 1.4);
        }
      }
    };

    const onPointerLeave = () => {
      cursor.active = false;
    };

    const drawParticle = (particle: CursorParticle, opacity: number) => {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.angle);
      ctx.scale(particle.stretch, 1 / Math.sqrt(particle.stretch));

      const gradient = ctx.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        particle.radius
      );
      gradient.addColorStop(0, `rgba(${HIGHLIGHT_COLOR}, ${0.28 * opacity})`);
      gradient.addColorStop(0.28, `rgba(${PARTICLE_COLOR}, ${0.24 * opacity})`);
      gradient.addColorStop(0.64, `rgba(${PARTICLE_COLOR}, ${0.09 * opacity})`);
      gradient.addColorStop(1, `rgba(${PARTICLE_COLOR}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, particle.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawConnections = () => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const reach = (a.radius + b.radius) * 1.25;

          if (dist > reach || dist < 1) continue;

          const tension = 1 - dist / reach;
          const alpha = tension * tension * 0.07 * Math.min(a.alpha, b.alpha);
          const width = Math.max(1, Math.min(7, tension * Math.min(a.radius, b.radius) * 0.62));

          ctx.strokeStyle = `rgba(${PARTICLE_COLOR}, ${alpha})`;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo((a.x + b.x) / 2 + dy * 0.03, (a.y + b.y) / 2 - dx * 0.03, b.x, b.y);
          ctx.stroke();
        }
      }
    };

    const draw = (now: number) => {
      const deltaMs = Math.min(40, now - lastTime);
      const delta = deltaMs / 16.67;
      lastTime = now;

      cursor.prevX = cursor.x;
      cursor.prevY = cursor.y;
      cursor.x += (cursor.targetX - cursor.x) * Math.min(1, 0.22 * delta);
      cursor.y += (cursor.targetY - cursor.y) * Math.min(1, 0.22 * delta);

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.life += deltaMs;
        const progress = particle.life / particle.maxLife;
        const pull = Math.max(0, 1 - progress) * 0.016;
        particle.vx += (cursor.x - particle.x) * pull * delta;
        particle.vy += (cursor.y - particle.y) * pull * delta;
        particle.vx += Math.sin((particle.life + particle.x) * 0.006) * particle.spin * delta;
        particle.vy += Math.cos((particle.life + particle.y) * 0.006) * particle.spin * delta;
        particle.vx *= Math.pow(0.968, delta);
        particle.vy *= Math.pow(0.968, delta);
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.angle += (Math.atan2(particle.vy, particle.vx) - particle.angle) * 0.08 * delta;
        particle.stretch += (1 - particle.stretch) * 0.026 * delta;

        if (progress >= 1) {
          particles.splice(i, 1);
          continue;
        }

        particle.radius = particle.baseRadius * (1 + progress * 1.55);
      }

      drawConnections();

      for (const particle of particles) {
        const progress = particle.life / particle.maxLife;
        const opacity = Math.pow(1 - progress, 1.2) * particle.alpha;
        drawParticle(particle, opacity);
      }

      if (cursor.active) {
        const speed = Math.hypot(cursor.targetX - cursor.prevX, cursor.targetY - cursor.prevY);
        const pulse = 0.76 + Math.sin(now * 0.009) * 0.1;
        const coreRadius = 16 + Math.min(16, speed * 0.085);
        const core = ctx.createRadialGradient(cursor.x, cursor.y, 0, cursor.x, cursor.y, coreRadius);
        core.addColorStop(0, `rgba(${HIGHLIGHT_COLOR}, ${0.16 * pulse})`);
        core.addColorStop(0.45, `rgba(${PARTICLE_COLOR}, ${0.11 * pulse})`);
        core.addColorStop(1, `rgba(${PARTICLE_COLOR}, 0)`);
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, coreRadius, 0, Math.PI * 2);
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
      className="fixed inset-0 z-[115] h-full w-full pointer-events-none mix-blend-screen blur-[1px]"
      aria-hidden="true"
    />
  );
}
