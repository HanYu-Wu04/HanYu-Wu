import { useEffect, useRef } from 'react';

export type ParticleWeatherMode = 'snow' | 'rain';
type ParticleWeatherTone = 'light' | 'contrast';

interface SnowfallCanvasProps {
  className?: string;
  density?: number;
  opacity?: number;
  mode?: ParticleWeatherMode;
  tone?: ParticleWeatherTone;
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
  flake: boolean;
  rotation: number;
  rotationSpeed: number;
};

type SnowSprite = {
  canvas: HTMLCanvasElement;
  size: number;
};

type GustState = {
  startTime: number;
  duration: number;
  strength: number;
  direction: number;
  nextTime: number;
};

type ThunderState = {
  startTime: number;
  duration: number;
  intensity: number;
  x: number;
  nextTime: number;
};

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

const weatherTones: Record<ParticleWeatherTone, {
  snowCore: string;
  snowMid: string;
  snowEdge: string;
  flakeStroke: string;
  flakeCore: string;
  breeze: string;
  pressureStart: string;
  pressureMid: string;
}> = {
  light: {
    snowCore: 'rgba(255,255,255,1)',
    snowMid: 'rgba(210,238,255,0.28)',
    snowEdge: 'rgba(255,255,255,0)',
    flakeStroke: 'rgba(240,250,255,0.92)',
    flakeCore: 'rgba(255,255,255,0.95)',
    breeze: 'rgba(220,245,255',
    pressureStart: '180,230,255',
    pressureMid: '120,205,245',
  },
  contrast: {
    snowCore: 'rgba(240,252,255,0.98)',
    snowMid: 'rgba(105,175,210,0.34)',
    snowEdge: 'rgba(80,145,185,0)',
    flakeStroke: 'rgba(115,175,205,0.76)',
    flakeCore: 'rgba(235,250,255,0.92)',
    breeze: 'rgba(130,205,235',
    pressureStart: '170,225,245',
    pressureMid: '100,185,220',
  },
};

function createSnowSprite(glow: number, tone: ParticleWeatherTone): SnowSprite {
  const size = Math.ceil(glow * 2 + 4);
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const spriteCtx = sprite.getContext('2d');

  if (spriteCtx) {
    const colors = weatherTones[tone];
    const center = size / 2;
    const gradient = spriteCtx.createRadialGradient(center, center, 0, center, center, glow);
    gradient.addColorStop(0, colors.snowCore);
    gradient.addColorStop(0.45, colors.snowMid);
    gradient.addColorStop(1, colors.snowEdge);
    spriteCtx.fillStyle = gradient;
    spriteCtx.beginPath();
    spriteCtx.arc(center, center, glow, 0, Math.PI * 2);
    spriteCtx.fill();
  }

  return { canvas: sprite, size };
}

function createSnowflakeSprite(size: number, tone: ParticleWeatherTone): SnowSprite {
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const spriteCtx = sprite.getContext('2d');

  if (spriteCtx) {
    const colors = weatherTones[tone];
    const center = size / 2;
    const arm = size * 0.36;
    spriteCtx.translate(center, center);
    spriteCtx.strokeStyle = colors.flakeStroke;
    spriteCtx.lineWidth = Math.max(1, size * 0.055);
    spriteCtx.lineCap = 'round';

    for (let i = 0; i < 6; i += 1) {
      spriteCtx.rotate(Math.PI / 3);
      spriteCtx.beginPath();
      spriteCtx.moveTo(0, 0);
      spriteCtx.lineTo(0, -arm);
      spriteCtx.moveTo(0, -arm * 0.62);
      spriteCtx.lineTo(-arm * 0.18, -arm * 0.8);
      spriteCtx.moveTo(0, -arm * 0.62);
      spriteCtx.lineTo(arm * 0.18, -arm * 0.8);
      spriteCtx.stroke();
    }

    spriteCtx.beginPath();
    spriteCtx.arc(0, 0, Math.max(1.2, size * 0.07), 0, Math.PI * 2);
    spriteCtx.fillStyle = colors.flakeCore;
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
  const flake = mode === 'snow' && !cluster && Math.random() < 0.08;
  const clusterX = Math.random() * width;
  return {
    x: cluster ? clusterX + (Math.random() - 0.5) * 74 : Math.random() * width,
    y: startAtTop ? -24 - Math.random() * height * 0.24 : Math.random() * height,
    vx: 0,
    vy: 0,
    clusterX,
    radius: mode === 'rain' ? 0.55 + Math.random() * 1.45 : cluster ? 0.65 + Math.random() * 1.7 : 0.8 + Math.random() * 2.6,
    speed: mode === 'rain' ? 9.4 + Math.random() * 8.2 : 0.28 + Math.random() * 0.72,
    drift: mode === 'rain' ? -1.9 - Math.random() * 1.8 : 0.18 + Math.random() * 0.42,
    phase: Math.random() * Math.PI * 2,
    alpha: mode === 'rain' ? 0.22 + Math.random() * 0.5 : cluster ? 0.26 + Math.random() * 0.34 : 0.34 + Math.random() * 0.52,
    cluster,
    length: mode === 'rain' ? 18 + Math.random() * 42 : 0,
    flake,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.014,
  };
}

export default function SnowfallCanvas({
  className = '',
  density = 72,
  opacity = 1,
  mode = 'snow',
  tone = 'light',
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
    const prefersDataSavings = (navigator as NavigatorWithConnection).connection?.saveData ?? false;
    const lowPowerDevice = (navigator.hardwareConcurrency ?? 8) <= 4 || prefersDataSavings;
    const qualityScale = lowPowerDevice ? 0.62 : 1;
    const modeDensity = mode === 'rain' ? density * 0.78 : density;
    const mobileScale = mode === 'snow' ? 0.56 : 0.72;
    const rawParticleCount = Math.round(modeDensity * (isMobile ? mobileScale : 1) * qualityScale);
    const mobileCap = mode === 'snow' ? 180 : 260;
    const desktopCap = mode === 'snow' ? 420 : 340;
    const particleCount = Math.max(36, Math.min(rawParticleCount, isMobile ? mobileCap : desktopCap));
    const dpr = Math.min(window.devicePixelRatio || 1, isCoarsePointer || lowPowerDevice ? 1 : 1.2);
    const frameInterval = mode === 'rain' || particleCount > 260 ? 1000 / 40 : 1000 / 48;
    const colors = weatherTones[tone];
    const particles: SnowParticle[] = [];
    const snowSprites = mode === 'snow'
      ? [2.4, 3.4, 4.8, 6.4, 8.2, 10.2].map((glow) => createSnowSprite(glow, tone))
      : [];
    const snowflakeSprites = mode === 'snow'
      ? [14, 18, 24].map((size) => createSnowflakeSprite(size, tone))
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
    let lastFrameTime = 0;
    let isCanvasVisible = true;
    let isDocumentVisible = !document.hidden;
    const gust: GustState = {
      startTime: -10000,
      duration: 1,
      strength: 0,
      direction: 1,
      nextTime: performance.now() + 2600 + Math.random() * 2600,
    };
    const thunder: ThunderState = {
      startTime: -10000,
      duration: 1,
      intensity: 0,
      x: width * 0.5,
      nextTime: performance.now() + 5200 + Math.random() * 6200,
    };

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

    const onVisibilityChange = () => {
      isDocumentVisible = !document.hidden;
    };

    const updateGust = (now: number) => {
      if (reduceMotion) {
        return 0;
      }

      if (now >= gust.nextTime) {
        gust.startTime = now;
        gust.duration = mode === 'rain' ? 1900 + Math.random() * 1300 : 2400 + Math.random() * 2200;
        gust.strength = mode === 'rain' ? 2.8 + Math.random() * 2.2 : 0.95 + Math.random() * 1.55;
        gust.direction = Math.random() < 0.72 ? 1 : -1;
        gust.nextTime = now + gust.duration + (mode === 'rain' ? 4200 + Math.random() * 5600 : 6200 + Math.random() * 6800);
      }

      const progress = (now - gust.startTime) / gust.duration;
      if (progress < 0 || progress > 1) {
        return 0;
      }

      return Math.sin(progress * Math.PI) * gust.strength * gust.direction;
    };

    const updateThunder = (now: number) => {
      if (mode !== 'rain' || reduceMotion) {
        return 0;
      }

      if (now >= thunder.nextTime) {
        thunder.startTime = now;
        thunder.duration = 480 + Math.random() * 320;
        thunder.intensity = 0.3 + Math.random() * 0.26;
        thunder.x = width * (0.18 + Math.random() * 0.64);
        thunder.nextTime = now + 7600 + Math.random() * 9800;
      }

      const progress = (now - thunder.startTime) / thunder.duration;
      if (progress < 0 || progress > 1) {
        return 0;
      }

      const flicker = progress < 0.18 || (progress > 0.34 && progress < 0.5) ? 1 : 0.42;
      return Math.pow(1 - progress, 1.45) * thunder.intensity * flicker;
    };

    const drawSnowBreeze = (wind: number, now: number) => {
      const intensity = Math.min(1, Math.abs(wind) / 1.8);
      if (mode !== 'snow' || intensity <= 0.04) {
        return;
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = tone === 'contrast' ? 'blur(9px)' : 'blur(6px)';
      const ribbonAlpha = (tone === 'contrast' ? 0.105 : 0.052) * intensity * opacity;
      const lineAlpha = (tone === 'contrast' ? 0.09 : 0.045) * intensity * opacity;

      for (let i = 0; i < 5; i += 1) {
        const y = ((now * 0.012 + i * height * 0.23) % (height + 240)) - 120;
        const offset = Math.sin(now * 0.00065 + i) * 58;
        const startX = wind > 0 ? -160 : width + 160;
        const endX = wind > 0 ? width + 160 : -160;
        const controlX = width * 0.5 + offset * wind;
        const controlY = y + 36 + Math.cos(now * 0.0009 + i * 1.7) * 42;
        const thickness = 18 + i * 3;

        const gradient = ctx.createLinearGradient(startX, y, endX, y + wind * 30);
        gradient.addColorStop(0, `${colors.breeze},0)`);
        gradient.addColorStop(0.42, `${colors.breeze},${ribbonAlpha})`);
        gradient.addColorStop(0.72, `${colors.breeze},${ribbonAlpha * 0.55})`);
        gradient.addColorStop(1, `${colors.breeze},0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.quadraticCurveTo(controlX, controlY, endX, y + wind * 26);
        ctx.lineTo(endX, y + wind * 26 + thickness);
        ctx.quadraticCurveTo(controlX, controlY + thickness * 0.7, startX, y + thickness);
        ctx.closePath();
        ctx.fill();
      }

      ctx.filter = 'none';
      ctx.lineCap = 'round';
      ctx.strokeStyle = `${colors.breeze},${lineAlpha})`;
      ctx.lineWidth = tone === 'contrast' ? 0.9 : 0.7;
      for (let i = 0; i < 18; i += 1) {
        const y = ((now * 0.026 + i * height * 0.071) % (height + 140)) - 70;
        const startX = ((now * 0.045 * Math.sign(wind || 1) + i * width * 0.137) % (width + 260)) - 130;
        const length = 42 + Math.sin(now * 0.001 + i) * 18;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.quadraticCurveTo(
          startX + length * 0.5,
          y + Math.sin(now * 0.0012 + i) * 10,
          startX + length * Math.sign(wind || 1),
          y + wind * 7
        );
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawThunder = (flash: number) => {
      if (mode !== 'rain' || flash <= 0) {
        return;
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(205,230,255,${flash * 1.25 * opacity})`;
      ctx.fillRect(0, 0, width, height);

      const boltAlpha = Math.min(0.92, flash * 3.8);
      ctx.strokeStyle = `rgba(235,248,255,${boltAlpha})`;
      ctx.lineWidth = 4.8;
      ctx.shadowColor = 'rgba(190,230,255,0.88)';
      ctx.shadowBlur = 34;
      ctx.beginPath();
      let x = thunder.x;
      let y = -16;
      ctx.moveTo(x, y);
      const boltPoints: Array<{ x: number; y: number }> = [{ x, y }];
      for (let i = 0; i < 9; i += 1) {
        x += (Math.random() - 0.5) * 92;
        y += 44 + Math.random() * 58;
        boltPoints.push({ x, y });
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.lineWidth = 1.8;
      ctx.shadowBlur = 22;
      for (let i = 2; i < boltPoints.length - 1; i += 2) {
        const point = boltPoints[i];
        const branchLength = 80 + Math.random() * 110;
        const branchDirection = Math.random() < 0.5 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(
          point.x + branchDirection * branchLength,
          point.y + 30 + Math.random() * 70
        );
        ctx.stroke();
      }

      const glow = ctx.createRadialGradient(thunder.x, 0, 0, thunder.x, 0, Math.max(width, height) * 0.55);
      glow.addColorStop(0, `rgba(170,220,255,${flash * 0.5})`);
      glow.addColorStop(1, 'rgba(170,220,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    };

    const updateParticle = (particle: SnowParticle, delta: number, wind: number) => {
      if (reduceMotion) {
        return;
      }

      particle.phase += 0.012 * delta;
      particle.y += particle.speed * delta;
      const clusterPull = particle.cluster ? (particle.clusterX - particle.x) * 0.0018 * delta : 0;
      const naturalDrift = mode === 'rain'
        ? (particle.drift + wind) * delta
        : Math.sin(particle.phase) * particle.drift * delta + clusterPull + wind * (particle.flake ? 1.15 : 0.72) * delta;
      particle.x += naturalDrift;
      particle.rotation += particle.rotationSpeed * delta + wind * 0.0025 * delta;

      if (cursor.active && particleCount <= 360) {
        const dx = particle.x - cursor.x;
        const dy = particle.y - cursor.y;
        const distSq = dx * dx + dy * dy;
        const cursorSpeed = Math.min(1, Math.hypot(cursor.vx, cursor.vy) / 42);
        const radius = mode === 'rain' ? 220 : 200;
        if (distSq < radius * radius && distSq > 1) {
          const proximity = 1 - distSq / (radius * radius);
          const force = proximity * proximity * (mode === 'rain' ? 1.12 : 0.84) * (1 + cursorSpeed * 1.5);
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const wake = mode === 'rain' ? 0.4 : 0.3;
          const twist = (mode === 'rain' ? 2.2 : 1.72) * proximity * (0.35 + cursorSpeed);
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
    };

    const draw = (now: number) => {
      if (!isCanvasVisible || !isDocumentVisible) {
        lastTime = now;
        animationId = window.requestAnimationFrame(draw);
        return;
      }

      if (now - lastFrameTime < frameInterval) {
        animationId = window.requestAnimationFrame(draw);
        return;
      }

      const delta = Math.min(2.4, (now - lastTime) / 16.67);
      lastTime = now;
      lastFrameTime = now;
      const wind = updateGust(now);
      const flash = updateThunder(now);

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      drawThunder(flash);
      drawSnowBreeze(wind, now);

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
          pressure.addColorStop(0, `rgba(${colors.pressureStart},${0.12 * cursorSpeed * opacity})`);
          pressure.addColorStop(0.48, `rgba(${colors.pressureMid},${0.055 * cursorSpeed * opacity})`);
          pressure.addColorStop(1, `rgba(${colors.pressureMid},0)`);
          ctx.fillStyle = pressure;
          ctx.beginPath();
          ctx.arc(cursor.x, cursor.y, pressureRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (mode === 'rain') {
        ctx.lineCap = 'round';
        const drawRainPass = (minRadius: number, maxRadius: number, alpha: number, lineWidth: number, lengthScale: number) => {
          ctx.globalAlpha = alpha * opacity;
          ctx.strokeStyle = 'rgb(190,225,245)';
          ctx.lineWidth = lineWidth;
          ctx.beginPath();

          for (const particle of particles) {
            if (particle.radius < minRadius || particle.radius >= maxRadius) {
              continue;
            }
            const windDrift = particle.drift + wind;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particle.x + windDrift * 2.9 * lengthScale, particle.y + particle.length * lengthScale);
          }

          ctx.stroke();
        };

        for (const particle of particles) {
          updateParticle(particle, delta, wind);
        }

        drawRainPass(0, 0.95, 0.34, 0.72, 0.78);
        drawRainPass(0.95, 1.45, 0.56, 1.15, 1);
        drawRainPass(1.45, 10, 0.72, 1.75, 1.18);

        if (Math.abs(wind) > 1.8) {
          ctx.globalAlpha = Math.min(0.16, Math.abs(wind) * 0.028) * opacity;
          ctx.strokeStyle = 'rgb(210,238,255)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (let i = 0; i < 12; i += 1) {
            const y = ((now * 0.08 + i * height * 0.091) % (height + 100)) - 50;
            const x = ((i * width * 0.19 + now * 0.038) % (width + 120)) - 60;
            ctx.moveTo(x, y);
            ctx.lineTo(x + wind * 22, y + 18);
          }
          ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        animationId = window.requestAnimationFrame(draw);
        return;
      }

      for (const particle of particles) {
        updateParticle(particle, delta, wind);

        if (particle.flake) {
          const flakeSprite = getSnowSprite(snowflakeSprites, particle.radius * 7.5);
          ctx.save();
          ctx.globalAlpha = particle.alpha * opacity * (tone === 'contrast' ? 0.92 : 0.72);
          ctx.translate(particle.x, particle.y);
          ctx.rotate(particle.rotation);
          ctx.drawImage(
            flakeSprite.canvas,
            -flakeSprite.size / 2,
            -flakeSprite.size / 2,
            flakeSprite.size,
            flakeSprite.size
          );
          ctx.restore();
          continue;
        }

        const glow = particle.radius * (particle.cluster ? 2.35 : 3.0);
        const sprite = getSnowSprite(snowSprites, glow);
        ctx.globalAlpha = particle.alpha * opacity * (tone === 'contrast' ? 1.08 : 1);
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
    document.addEventListener('visibilitychange', onVisibilityChange);
    const observer = new IntersectionObserver(([entry]) => {
      isCanvasVisible = entry.isIntersecting;
    });
    observer.observe(canvas);
    animationId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      observer.disconnect();
    };
  }, [density, opacity, mode, tone]);

  return (
    <canvas
      ref={canvasRef}
      className={`block h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
}
