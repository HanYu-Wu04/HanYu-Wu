import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, useScroll, useTransform } from 'motion/react';
import { vertexShader, fluidFragmentShader, displayFragmentShader } from '../shaders';
import LandoText from './LandoText';
import Stroke from './Stroke';
import { Download } from 'lucide-react';

function createIceMask(): { 
  group: THREE.Group; 
  scanMaterial: THREE.ShaderMaterial; 
  particleMaterial: THREE.ShaderMaterial;
  dispose: () => void;
} {
  const group = new THREE.Group();

  // Custom shader material for wireframe scanning effect with vertex displacement (ice crystals)
  const scanMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 }, // 0.0 to 1.0
      uColor: { value: new THREE.Color('#38bdf8') }, // Ice blue glow
      uGlowColor: { value: new THREE.Color('#ffffff') },
      uTime: { value: 0.0 },
      uAlpha: { value: 1.0 },
      uFluid: { value: null },
      uResolution: { value: new THREE.Vector2() }
    },
    vertexShader: `
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vLocalPos;
      uniform float uTime;
      uniform float uProgress;

      // Simple hash function for random vertex displacement
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      
      void main() {
        vLocalPos = position;
        vNormal = normalMatrix * normal;
        
        // Jitter vertices along normal to simulate rugged, crystalline ice edges
        float noise = hash(position * 12.0) * 0.035;
        // Subtle organic breathing animation
        float wave = sin(position.y * 8.0 + uTime * 1.5) * cos(position.x * 8.0 - uTime * 1.5) * 0.008;
        
        // Calculate the scan position in local space
        float minY = -0.95;
        float maxY = 0.95;
        float scanY = mix(maxY + 0.05, minY - 0.05, uProgress);
        
        // Physical displacement boundary effect (growing/vibrating crystals at the scan line)
        float distToScan = position.y - scanY;
        float boundaryGlow = exp(-abs(distToScan) * 12.0);
        float boundaryOffset = boundaryGlow * 0.05 * (sin(uTime * 25.0) * 0.5 + 0.5);
        
        vec3 displaced = position + normal * (noise + wave + boundaryOffset);
        
        vPosition = displaced;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vLocalPos;
      uniform float uProgress;
      uniform vec3 uColor;
      uniform vec3 uGlowColor;
      uniform float uTime;
      uniform float uAlpha;
      uniform sampler2D uFluid;
      uniform vec2 uResolution;
      
      void main() {
        // Head sphere height bounds
        float minY = -0.95;
        float maxY = 0.95;
        
        float scanY = mix(maxY + 0.05, minY - 0.05, uProgress);
        
        // Discard pixels below scan line (formation from top to bottom)
        if (vPosition.y < scanY) {
          discard;
        }
        
        // Eye cutout opening in local coordinate space of head sphere
        // Positioned at eye/glasses level (shifted lower to match eyes)
        if (vLocalPos.z > 0.15 && vLocalPos.y > -0.28 && vLocalPos.y < -0.08 && abs(vLocalPos.x) < 0.52) {
          discard;
        }
        
        float distToScan = abs(vPosition.y - scanY);
        float edgeGlow = exp(-distToScan * 28.0); // Wider scan glow for prominent "constructing" scanning line
        
        vec3 finalColor = mix(uColor, uGlowColor, edgeGlow * 0.9);
        
        // Cancel out the 3D frame based on cursor fluid trail intensity
        vec2 screenUv = gl_FragCoord.xy / uResolution;
        float trailVal = texture2D(uFluid, screenUv).r;
        float cancelFactor = 1.0 - smoothstep(0.01, 0.35, trailVal);
        
        float alpha = mix(0.35, 1.0, edgeGlow) * uAlpha * cancelFactor;
        
        if (alpha < 0.01) {
          discard;
        }
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    wireframe: true,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  // Ice particle sparkles material
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: scanMaterial.uniforms,
    vertexShader: `
      uniform float uTime;
      uniform float uProgress;
      varying vec3 vPosition;
      
      void main() {
        vPosition = position;
        // Jitter particles in 3D to look like floating snow crystals
        vec3 jitter = vec3(
          sin(position.x * 15.0 + uTime * 3.0) * 0.018,
          cos(position.y * 15.0 + uTime * 2.5) * 0.018,
          sin(position.z * 15.0 - uTime * 3.5) * 0.018
        );
        vec3 pos = position + jitter;
        
        // Calculate scanning line
        float minY = -0.95;
        float maxY = 0.95;
        float scanY = mix(maxY + 0.05, minY - 0.05, uProgress);
        
        // Enlarge particles close to the scanning boundary
        float distToScan = abs(position.y - scanY);
        float boundaryGlow = exp(-distToScan * 15.0);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = mix(3.0, 9.0, boundaryGlow);
      }
    `,
    fragmentShader: `
      varying vec3 vPosition;
      uniform float uProgress;
      uniform float uAlpha;
      uniform vec3 uGlowColor;
      uniform sampler2D uFluid;
      uniform vec2 uResolution;
      
      void main() {
        float minY = -0.95;
        float maxY = 0.95;
        float scanY = mix(maxY + 0.05, minY - 0.05, uProgress);
        
        if (vPosition.y < scanY) {
          discard;
        }
        
        // Cancel out particles based on cursor fluid trail intensity
        vec2 screenUv = gl_FragCoord.xy / uResolution;
        float trailVal = texture2D(uFluid, screenUv).r;
        if (trailVal > 0.08) {
          discard;
        }
        
        // Soft round point sparkle shape
        vec2 uv = gl_PointCoord - vec2(0.5);
        if (dot(uv, uv) > 0.25) discard;
        
        gl_FragColor = vec4(uGlowColor, uAlpha * 0.75);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  // 1. Head Ellipsoid Geometry (Enlarged to fit head outline fully)
  const headGeo = new THREE.SphereGeometry(0.74, 32, 32);
  headGeo.scale(1.0, 1.2, 1.0);
  const headMesh = new THREE.Mesh(headGeo, scanMaterial);
  headMesh.rotation.x = -0.06;
  headMesh.frustumCulled = false;
  group.add(headMesh);

  // 2. Ambient ice particles aligned with head silhouette
  const particleGeo = new THREE.BufferGeometry();
  const particleCount = 150;
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 0.72 + Math.random() * 0.10;
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = (radius * 1.2) * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const particles = new THREE.Points(particleGeo, particleMaterial);
  particles.frustumCulled = false;
  group.add(particles);

  return { 
    group, 
    scanMaterial, 
    particleMaterial,
    dispose: () => {
      headGeo.dispose();
      particleGeo.dispose();
      scanMaterial.dispose();
      particleMaterial.dispose();
    }
  };
}

const FluidDistortion: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Scroll Progress logic
  const { scrollYProgress } = useScroll();
  
  // Transform values for the shrinking box
  const boxWidth = useTransform(scrollYProgress, [0.08, 0.25], ['100vw', '32vw']);
  const boxHeight = useTransform(scrollYProgress, [0.08, 0.25], ['100vh', '45vh']);
  const boxY = useTransform(scrollYProgress, [0.35, 0.55], ['0%', '-20%']);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.25], [0, 0]);
  const videoOpacity = useTransform(scrollYProgress, [0, 1], [1, 1]);
  
  // Section-specific opacities and offsets
  const section1Opacity = useTransform(scrollYProgress, [0, 0.4], [1, 1]);
  const marqueeOpacity = useTransform(scrollYProgress, [0.04, 0.1], [0, 1]);
  const signatureOpacity = useTransform(scrollYProgress, [0.12, 0.14, 0.28, 0.33], [0, 1, 1, 0]);
  const signatureScale = useTransform(scrollYProgress, [0.12, 0.25], [0.92, 1]);
  const signaturePathLength = useTransform(scrollYProgress, [0.12, 0.25], [0, 1]);
  
  // Scene coordination: After shrinking, the whole "Landing" scene moves up
  const sceneY = useTransform(scrollYProgress, [0.27, 0.42], ['0%', '-100%']);
  
  const manifestoOpacity = useTransform(scrollYProgress, [0.31, 0.42, 1.0], [0, 1, 1]);
  const manifestoY = useTransform(scrollYProgress, [0.31, 0.42, 1.0], ['100%', '0%', '0%']);

  // Background Darkening & Effects - Clean dark transition at the end
  const bgBrightness = useTransform(scrollYProgress, [0, 1.0], [1, 1]);
  const bgBlur = useTransform(scrollYProgress, [0.5, 0.8, 0.95, 1.0], ['blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(0px)']);
  const frostVignette = useTransform(scrollYProgress, [0, 0.5, 0.7, 0.95, 1.0], [0, 0, 0, 0, 0]);
  const textColor = useTransform(scrollYProgress, [0.88, 0.94, 1.0], ['#ffffff', '#ffffff', '#ffffff']);
  const topUIOpacity = 1;

  const [isIceManMode, setIsIceManMode] = useState(false);
  const iceManRef = useRef(false);
  const typedKeys = useRef('');

  // Assets
  const ASSETS = {
    bgVideo: '/snow.mp4',
    baseImage: '/base.png',
    revealImage: '/top.png',
    iceImage: '/top.png' // Changed from /ice.png to /top.png per request
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: true, 
      antialias: false,
      powerPreference: "high-performance"
    });
    
    let width = containerRef.current.clientWidth;
    let height = containerRef.current.clientHeight;
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

    const mouse = new THREE.Vector2(0.5, 0.5);
    const prevMouse = new THREE.Vector2(0.5, 0.5);
    const autoMouse = new THREE.Vector2(0.5, 0.5);
    const prevAutoMouse = new THREE.Vector2(0.5, 0.5);
    let isMoving = false;
    let lastMoveTime = -10000; // Start with idle status to trigger auto-brush immediately
    
    const onKeyDown = (event: KeyboardEvent) => {
      typedKeys.current = (typedKeys.current + event.key.toLowerCase()).slice(-20);
      if (typedKeys.current.includes('iceman')) {
        setIsIceManMode(true);
        iceManRef.current = true;
        typedKeys.current = ''; 
      }
    };

    const size = 512;
    const renderTargetOptions = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
    };

    const pingPongTargets = [
      new THREE.WebGLRenderTarget(size, size, renderTargetOptions),
      new THREE.WebGLRenderTarget(size, size, renderTargetOptions),
    ];
    let currentTargetIndex = 0;

    const videoSize = new THREE.Vector2(1, 1);
    const baseSize = new THREE.Vector2(1, 1);
    const revealSize = new THREE.Vector2(1, 1);
    const iceSize = new THREE.Vector2(1, 1);

    const trailsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPrevTrails: { value: null },
        uMouse: { value: mouse },
        uPrevMouse: { value: prevMouse },
        uAutoMouse: { value: autoMouse },
        uPrevAutoMouse: { value: prevAutoMouse },
        uResolution: { value: new THREE.Vector2(size, size) },
        uDecay: { value: 0.985 },
        uIsMoving: { value: false },
        uUseAutoMouse: { value: true },
      },
      vertexShader,
      fragmentShader: fluidFragmentShader,
    });

    const displayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uFluid: { value: null },
        uVideoTexture: { value: new THREE.Texture() },
        uBaseTexture: { value: new THREE.Texture() },
        uRevealTexture: { value: new THREE.Texture() },
        uIceTexture: { value: new THREE.Texture() },
        uResolution: { value: new THREE.Vector2(width, height) },
        uVideoSize: { value: videoSize },
        uBaseSize: { value: baseSize },
        uRevealSize: { value: revealSize },
        uIceSize: { value: iceSize },
        uIceManMode: { value: false },
      },
      vertexShader,
      fragmentShader: displayFragmentShader,
    });

    const loadVideo = (url: string) => {
      const video = document.createElement('video');
      video.src = url;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'Anonymous';
      video.play().catch(e => console.warn("Video play failed:", e));

      video.onloadeddata = () => {
        videoSize.set(video.videoWidth, video.videoHeight);
        const tex = new THREE.VideoTexture(video);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        displayMaterial.uniforms.uVideoTexture.value = tex;
      };

      video.onerror = () => {
        console.warn(`Could not load video ${url}.`);
      };

      return video;
    };

    const loadImage = (url: string, type: 'base' | 'reveal' | 'ice', sizeVector: THREE.Vector2) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        sizeVector.set(img.width, img.height);
        const tex = new THREE.Texture(img);
        tex.needsUpdate = true;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        
        if (type === 'base') {
          displayMaterial.uniforms.uBaseTexture.value = tex;
        } else if (type === 'reveal') {
          displayMaterial.uniforms.uRevealTexture.value = tex;
        } else {
          displayMaterial.uniforms.uIceTexture.value = tex;
        }
      };
      
      img.onerror = () => {
        console.warn(`Could not load ${url}.`);
      };
      img.src = url;
    };

    const bgVideo = loadVideo(ASSETS.bgVideo);
    loadImage(ASSETS.baseImage, 'base', baseSize);
    loadImage(ASSETS.revealImage, 'reveal', revealSize);
    loadImage(ASSETS.iceImage, 'ice', iceSize);

    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    const displayMesh = new THREE.Mesh(planeGeometry, displayMaterial);
    displayMesh.position.z = -0.5; // Place background quad behind the helmet
    scene.add(displayMesh);

    // Create and position the holographic 3D ice mask overlay
    const iceMaskObj = createIceMask();
    const iceMaskGroup = iceMaskObj.group;
    // Position mask over head (centered at y = 0.00 in NDC to fit exactly on the head/face of the portrait)
    iceMaskGroup.position.set(0, 0.00, 0.0);
    scene.add(iceMaskGroup);

    const simMesh = new THREE.Mesh(planeGeometry, trailsMaterial);
    const simScene = new THREE.Scene();
    simScene.add(simMesh);

    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      prevMouse.copy(mouse);
      mouse.x = (event.clientX - rect.left) / rect.width;
      mouse.y = 1 - (event.clientY - rect.top) / rect.height;
      isMoving = true;
      lastMoveTime = performance.now();
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        prevMouse.copy(mouse);
        mouse.x = (touch.clientX - rect.left) / rect.width;
        mouse.y = 1 - (touch.clientY - rect.top) / rect.height;
        isMoving = true;
        lastMoveTime = performance.now();
      }
    };

    const updateRendererSize = () => {
      if (!containerRef.current) return;
      const { width: rectWidth, height: rectHeight } = containerRef.current.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rectWidth));
      const h = Math.max(1, Math.floor(rectHeight));
      if (w !== width || h !== height) {
        renderer.setSize(w, h, false);
        displayMaterial.uniforms.uResolution.value.set(w, h);
        width = w;
        height = h;
        
        // Immediately render scene to prevent blank canvas flicker during resize / scroll
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
      }
    };

    const resizeObserver = new ResizeObserver(updateRendererSize);
    resizeObserver.observe(containerRef.current);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('resize', updateRendererSize);
    window.addEventListener('keydown', onKeyDown);

    let maskFormedProgress = 0.0;
    let currentRotationX = -0.08;
    let currentRotationY = 0.0;

    const animate = () => {
      const animationId = requestAnimationFrame(animate);
      const time = performance.now() * 0.001;

      if (isMoving && performance.now() - lastMoveTime > 100) {
        isMoving = false;
      }

      // Update autonomous movement (4-stroke raster pattern from top to bottom)
      prevAutoMouse.copy(autoMouse);
      
      const sweepDuration = 6.0;
      const tNorm = (time % sweepDuration) / sweepDuration;
      
      const nextY = 0.85 - 0.70 * tNorm;
      const angle = tNorm * Math.PI * 4.0 - Math.PI / 2.0;
      const nextX = 0.5 + 0.42 * Math.sin(angle);
      
      autoMouse.set(nextX, nextY);
      
      // Prevent drawing a line when the loop resets from bottom to top
      if (Math.abs(autoMouse.y - prevAutoMouse.y) > 0.4) {
        prevAutoMouse.copy(autoMouse);
      }

      const prevTarget = pingPongTargets[currentTargetIndex];
      currentTargetIndex = (currentTargetIndex + 1) % 2;
      const currentRenderTarget = pingPongTargets[currentTargetIndex];

      const isIdle = (performance.now() - lastMoveTime) > 3000;
      trailsMaterial.uniforms.uPrevTrails.value = prevTarget.texture;
      trailsMaterial.uniforms.uMouse.value.copy(mouse);
      trailsMaterial.uniforms.uPrevMouse.value.copy(prevMouse);
      trailsMaterial.uniforms.uAutoMouse.value.copy(autoMouse);
      trailsMaterial.uniforms.uPrevAutoMouse.value.copy(prevAutoMouse);
      trailsMaterial.uniforms.uIsMoving.value = isMoving;
      trailsMaterial.uniforms.uUseAutoMouse.value = isIdle;

      renderer.setRenderTarget(currentRenderTarget);
      renderer.render(simScene, camera);
      displayMaterial.uniforms.uFluid.value = currentRenderTarget.texture;
      displayMaterial.uniforms.uIceManMode.value = iceManRef.current;

      // Loop the ice mask scanning progress continuously with a premium pause when fully formed
      maskFormedProgress += 0.0045;
      if (maskFormedProgress > 1.3) {
        maskFormedProgress = 0.0;
      }

      // Read scroll and fade out ice mask opacity as user scrolls past hero section
      const currentScroll = scrollYProgress.get();
      let scrollFade = 1.0;
      if (currentScroll > 0.05) {
        scrollFade = Math.max(0.0, 1.0 - (currentScroll - 0.05) / 0.1);
      }

      iceMaskObj.scanMaterial.uniforms.uProgress.value = Math.min(1.0, maskFormedProgress);
      iceMaskObj.scanMaterial.uniforms.uTime.value = time;
      iceMaskObj.scanMaterial.uniforms.uAlpha.value = scrollFade;
      iceMaskObj.scanMaterial.uniforms.uFluid.value = currentRenderTarget.texture;
      const pr = renderer.getPixelRatio();
      iceMaskObj.scanMaterial.uniforms.uResolution.value.set(width * pr, height * pr);

      // Interactive 3D ice mask tilt based on mouse position
      let targetRotX = -0.08;
      let targetRotY = 0.0;
      if (isMoving) {
        // Map Y mouse coordinate to X rotation (vertical tilt) and X mouse coordinate to Y rotation (horizontal pan)
        targetRotX = -0.08 + (mouse.y - 0.5) * 0.22;
        targetRotY = (mouse.x - 0.5) * 0.35;
      }
      currentRotationX += (targetRotX - currentRotationX) * 0.08;
      currentRotationY += (targetRotY - currentRotationY) * 0.08;

      iceMaskGroup.rotation.x = currentRotationX;
      iceMaskGroup.rotation.y = currentRotationY;
      iceMaskGroup.visible = !iceManRef.current;

      // Apply aspect ratio scale correction dynamically to prevent horizontal stretching and position drifts
      const aspect = width / height;
      const textureAspect = baseSize.y > 0 ? baseSize.x / baseSize.y : 1.0;
      
      const frameScale = 1.06;
      const baseY = 0.00;

      if (aspect > textureAspect) {
        // Viewport is wider than portrait (contain height-limited)
        iceMaskGroup.scale.set((1.0 / aspect) * frameScale, frameScale, frameScale);
        iceMaskGroup.position.set(0, baseY, 0.0);
      } else {
        // Viewport is taller than portrait (contain width-limited)
        const scaleFactor = aspect / textureAspect;
        iceMaskGroup.scale.set((1.0 / textureAspect) * frameScale, scaleFactor * frameScale, frameScale);
        iceMaskGroup.position.set(0, baseY * scaleFactor, 0.0);
      }

      renderer.setRenderTarget(null);
      renderer.render(scene, camera);

      return animationId;
    };

    const animId = animate();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', updateRendererSize);
      window.removeEventListener('keydown', onKeyDown);
      resizeObserver.disconnect();
      cancelAnimationFrame(animId);
      renderer.dispose();
      pingPongTargets.forEach(t => t.dispose());
      iceMaskObj.dispose();
      bgVideo.pause();
      bgVideo.remove();
    };
  }, []);

  return (
    <div ref={scrollRef} className="relative w-full h-[130vh] bg-[#0A0F1A]">
      {/* Background Snow Video - Page Wide */}
      <motion.div 
        style={{ 
          opacity: videoOpacity,
          filter: useTransform(
            [bgBrightness, bgBlur],
            ([brightness, blur]) => `brightness(${brightness}) ${blur}`
          )
        }}
        className="fixed inset-0 z-0 pointer-events-none"
      >
        <video 
          autoPlay 
          muted 
          loop 
          playsInline 
          className="w-full h-full object-cover"
        >
          <source src={ASSETS.bgVideo} type="video/mp4" />
        </video>
      </motion.div>
      
      {/* Frost Creep Vignette */}
      <motion.div 
        style={{ 
          opacity: frostVignette,
          background: 'radial-gradient(circle, transparent 40%, rgba(186, 230, 253, 0.3) 100%)',
          backdropFilter: 'blur(2px)'
        }}
        className="fixed inset-0 z-[40] pointer-events-none mix-blend-screen"
      />

      {/* Scrim Overlay for UI Contrast */}
      <div 
        className="fixed top-0 left-0 w-full h-[120px] z-[45] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(10, 15, 22, 0.4) 0%, transparent 100%)'
        }}
      />

      {/* Global Brand UI - Always Visible */}
      <div className="fixed inset-0 z-[120] select-none pointer-events-none px-2 pt-2 pb-1 md:px-4 md:pt-4 md:pb-2 flex flex-col justify-between">
        <motion.div 
          className="flex justify-between items-start"
          style={{ 
            color: textColor,
            opacity: topUIOpacity
          }}
        >
          {/* Top Left: Stacked Name */}
          <div className="pointer-events-auto cursor-pointer flex flex-col pt-1 select-none group">
            <span className="text-3xl md:text-6xl font-black tracking-tighter leading-[0.7] uppercase group-hover:text-sky-400 transition-colors">
              <LandoText text="HanYu" />
            </span>
            <span className="text-3xl md:text-6xl font-black tracking-tighter leading-[0.85] uppercase group-hover:text-sky-400 transition-colors">
              <LandoText text="Wu" />
            </span>
          </div>

          {/* Top Right: Resume Button & Menu */}
          <div className="pointer-events-auto pt-1 flex items-center gap-3">
              <motion.a
                href="/HanYu_Wu_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-3 py-2 md:px-6 md:py-3 bg-sky-500 rounded-lg transition-all flex items-center gap-2 md:gap-3 group shadow-[0_0_20px_rgba(14,165,233,0.3)]"
              >
                <Download className="w-4 h-4 md:w-5 md:h-5 text-white" />
                <span className="text-[10px] md:text-sm font-black uppercase tracking-tighter text-white">
                  <LandoText text="RESUME" />
                </span>
              </motion.a>
          </div>

          {/* Top Center: Iconic Mark */}
          <div className="absolute left-1/2 -translate-x-1/2 top-4 flex flex-col items-center justify-center gap-2">
            <svg width="36" height="36" viewBox="0 0 40 40" className="fill-current">
              <path d="M10 5L5 35H12L15 20H25L22 35H30L35 5H27L24 18H14L17 5H10Z" />
            </svg>
            <motion.span 
              style={{ opacity: marqueeOpacity }}
              className="text-[8px] font-black tracking-[0.4em] uppercase text-white/50"
            >
              WHO AM I
            </motion.span>
          </div>
        </motion.div>



      </div>

      {/* Main Experience Section (Full 1000vh) */}
      <div className="relative h-[1000vh] w-full z-20">
        <motion.div 
          style={{ opacity: section1Opacity }}
          className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden"
        >
          {/* Landing Scene (Box + Marquee) */}
          <motion.div 
            style={{ y: sceneY }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Dynamic Background Marquee - Now moves with the scene */}
            <motion.div 
              style={{ opacity: marqueeOpacity }}
              className="absolute inset-0 z-5 flex flex-col justify-center overflow-hidden pointer-events-none select-none"
            >
                <motion.div 
                  animate={{ x: [0, -2000] }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  className="whitespace-nowrap text-[6vw] font-black italic tracking-tighter text-blue-950/60 leading-none mb-4 [word-spacing:1vw]"
                >
                  FULLSTACK SOFTWARE ENGINEER FULLSTACK SOFTWARE ENGINEER FULLSTACK SOFTWARE ENGINEER FULLSTACK SOFTWARE ENGINEER FULLSTACK SOFTWARE ENGINEER
                </motion.div>
                <motion.div 
                  animate={{ x: [-2000, 0] }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                  className="whitespace-nowrap text-[6vw] font-black italic tracking-tighter text-sky-900/40 leading-none [word-spacing:1vw]"
                >
                  FORWARD DEPLOYED ENGINEER FORWARD DEPLOYED ENGINEER FORWARD DEPLOYED ENGINEER FORWARD DEPLOYED ENGINEER FORWARD DEPLOYED ENGINEER
                </motion.div>
            </motion.div>

            {/* Shrinking Box Container */}
            <motion.div
              style={{ 
                width: boxWidth,
                height: boxHeight,
              }}
              className="relative flex items-center justify-center overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.4)] z-20"
            >
              <motion.div 
                ref={containerRef} 
                className="absolute inset-0 w-full h-full"
              >
                {/* Removed block overlay */}
                <canvas 
                  ref={canvasRef} 
                  className="absolute inset-0 w-full h-full block cursor-none z-0"
                />
              </motion.div>
            </motion.div>

          </motion.div>

          {/* Signature Overlay */}
          <motion.div
            style={{
              opacity: signatureOpacity,
              scale: signatureScale,
            }}
            className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center px-6"
          >
            <div className="h-[140vh] w-[min(192vw,224vh)]">
              <Stroke
                className="w-full h-full drop-shadow-[0_0_44px_rgba(14,165,233,0.65)] overflow-visible"
                color="#0ea5e9"
                pathLength={signaturePathLength}
                strokeWidth={5}
              />
            </div>
          </motion.div>

          {/* Manifesto Text - Moves up into the "new space" from below */}
          <motion.div
            style={{ 
              opacity: manifestoOpacity,
              y: manifestoY
            }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none p-6 md:p-10"
          >
            <div className="max-w-6xl text-center pointer-events-auto group">
              <h2 className="text-[6vw] md:text-[4.5vw] font-black leading-[1.2] md:leading-[1] tracking-tight uppercase italic select-none text-blue-950 drop-shadow-sm px-4">
                <span className="text-sky-600">Redefining</span> <span className="text-blue-900/80">Boundaries,</span>{" "}
                <span className="text-blue-900/40">Pushing</span> <span className="text-sky-500">Creativity,</span>{" "}
                <span className="text-blue-900/60">Bringing</span> <span className="text-blue-900/40">it all in</span>{" "}
                <span className="text-blue-900/80">every</span> <span className="text-sky-600">line.</span> <br />
                <span className="text-blue-900/40">Defining a</span> <span className="text-sky-500">Legacy</span> <span className="text-blue-900/40">in the world of</span>{" "}
                <span className="text-blue-900/40">Code</span> <span className="text-blue-900/40">on and off the</span>{" "}
                <span className="text-sky-600">screen.</span>
              </h2>
            </div>
          </motion.div>

          {/* Topographic Lines Overlay */}
          <div className="absolute inset-0 z-[-1] pointer-events-none overflow-hidden opacity-[0.03]">
             <svg viewBox="0 0 1000 1000" className="w-full h-full scale-125 text-white">
               {[...Array(8)].map((_, i) => (
                  <path 
                    key={i}
                    d={`M-100,${150 * i} Q250,${100 * i} 500,${150 * i} T1100,${150 * i}`} 
                    stroke="currentColor" 
                    fill="none" 
                    strokeWidth="0.5" 
                  />
               ))}
             </svg>
          </div>
        </motion.div>
      </div>

      {/* Grain Finish */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat z-[100]" />
    </div>
  );
};

export default FluidDistortion;
