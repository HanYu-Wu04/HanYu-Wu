import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from 'motion/react';
import { vertexShader, fluidFragmentShader, displayFragmentShader } from '../shaders';
import LandoText from './LandoText';
import Stroke from './Stroke';
import { Download } from 'lucide-react';
import MenuOverlay from './MenuOverlay';

const FINAL_SCROLL_PROGRESS = 1;
const VIDEO_FREEZE_SCROLL_PROGRESS = 0.99;
const FINAL_SNOW_FRAME_TIME = 5.8;
const GALLERY_SCROLL_HEIGHT = '1750vh';
const MANIFESTO_EXIT_START = 0.74;
const MANIFESTO_EXIT_END = 0.82;
const GALLERY_REVEAL_START = 0.85;
const GALLERY_REVEAL_END = 0.89;
const GALLERY_FINAL_X = '-290vw';

const galleryItems = [
  {
    date: 'SEP 2022',
    title: 'CAL POLY',
    meta: 'FIRST ARRIVAL / SAN LUIS OBISPO',
    src: '/calpoly.jpg',
    left: '56vw',
    top: '18vh',
    width: '26vw',
    minWidth: '300px',
    maxWidth: '480px',
    aspectRatio: '670 / 432',
    muted: false,
  },
  {
    date: 'JUN 2023 - AUG 2023',
    title: 'SPARKLI AI',
    meta: 'SOFTWARE ENGINEER INTERN / PALO ALTO',
    src: '/sparkliai.png',
    left: '126vw',
    top: '50vh',
    width: '28vw',
    minWidth: '320px',
    maxWidth: '520px',
    aspectRatio: '3320 / 1894',
    muted: false,
  },
  {
    date: 'OCT 2023 - AUG 2025',
    title: 'HACK4IMPACT',
    meta: 'TECH LEAD / SAN LUIS OBISPO',
    src: '/hack4impact.png',
    left: '164vw',
    top: '16vh',
    width: '30vw',
    minWidth: '340px',
    maxWidth: '560px',
    aspectRatio: '3010 / 1530',
    muted: false,
  },
  {
    date: 'JUN 2024 - SEP 2025',
    title: 'CAL POLY CSSE',
    meta: 'MOBILE APP TEAM LEAD / SAN LUIS OBISPO',
    src: '/csse.png',
    left: '202vw',
    top: '52vh',
    width: '26vw',
    minWidth: '320px',
    maxWidth: '500px',
    aspectRatio: '3072 / 2048',
    muted: false,
  },
  {
    date: 'JAN 2025 - AUG 2025',
    title: 'LIVIN',
    meta: 'DEVELOPMENT TECH LEAD / SAN LUIS OBISPO',
    src: '/livin.png',
    left: '238vw',
    top: '16vh',
    width: '30vw',
    minWidth: '340px',
    maxWidth: '560px',
    aspectRatio: '3020 / 1532',
    muted: false,
  },
  {
    date: 'SEP 2025 - DEC 2025',
    title: 'YUANSHENG REFURBISHER',
    meta: 'CO-FOUNDER / LOS ANGELES',
    src: '/refurbisher.jpg',
    left: '276vw',
    top: '46vh',
    width: '18vw',
    minWidth: '220px',
    maxWidth: '320px',
    aspectRatio: '1289 / 2269',
    muted: false,
  },
  {
    date: 'JAN 2026 - MAY 2026',
    title: 'CAMPUSIRL',
    meta: 'FOUNDER & LEAD ENGINEER / SAN LUIS OBISPO',
    src: '/campusirl.png',
    left: '304vw',
    top: '12vh',
    width: '18vw',
    minWidth: '220px',
    maxWidth: '320px',
    aspectRatio: '1290 / 2796',
    muted: false,
  },
  {
    date: 'JUN 2026',
    title: 'GRADUATION',
    meta: 'CAL POLY / SAN LUIS OBISPO',
    src: '/grad.jpg',
    left: '332vw',
    top: '48vh',
    width: '28vw',
    minWidth: '340px',
    maxWidth: '540px',
    aspectRatio: '2304 / 1536',
    muted: false,
  },
];

function lockVideoToFinalFrame(video: HTMLVideoElement) {
  if (Number.isFinite(video.duration)) {
    video.currentTime = Math.min(FINAL_SNOW_FRAME_TIME, Math.max(0, video.duration - 0.05));
  } else {
    video.currentTime = FINAL_SNOW_FRAME_TIME;
  }
  video.pause();
}

const RevealLetter: React.FC<{
  scrollYProgress: any;
  start: number;
  end: number;
  char: string;
  isLast: boolean;
}> = ({ scrollYProgress, start, end, char, isLast }) => {
  const opacity = useTransform(scrollYProgress, [start, end], [0, 1], { clamp: true });
  return (
    <motion.span
      style={{ 
        opacity, 
        marginRight: isLast ? 0 : '0.4em' 
      }}
    >
      {char === " " ? "\u00A0" : char}
    </motion.span>
  );
};

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
      uColor: { value: new THREE.Color('#0ea5e9') }, // Signature blue glow
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

const RevealLine: React.FC<{ 
  children: React.ReactNode; 
  index: number; 
  isVisible: boolean;
}> = ({ children, index, isVisible }) => {
  const barVariants = {
    hidden: { left: 0, width: "0%" },
    visible: {
      width: ["0%", "100%", "0%"],
      left: ["0%", "0%", "100%"],
      transition: {
        delay: index * 0.22,
        duration: 0.65,
        ease: [0.76, 0, 0.24, 1] as any
      }
    }
  };

  const textVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delay: index * 0.22 + 0.30,
        duration: 0.01
      }
    }
  };

  return (
    <div className="relative inline-block overflow-hidden py-1 px-2 select-none">
      {/* The Text */}
      <motion.span
        variants={textVariants}
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        className="block"
      >
        {children}
      </motion.span>
      {/* The Sweeping Reveal Bar */}
      <motion.div
        variants={barVariants}
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        className="absolute top-0 bottom-0 bg-[#0ea5e9] z-10"
      />
    </div>
  );
};

const FluidDistortion: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Scroll Progress logic
  const { scrollYProgress } = useScroll();
  
  // Transform values for the shrinking box
  const boxWidth = useTransform(scrollYProgress, [0.08, 0.38], ['100vw', '32vw']);
  const boxHeight = useTransform(scrollYProgress, [0.08, 0.38], ['100vh', '45vh']);
  const boxY = useTransform(scrollYProgress, [0.35, 0.55], ['0%', '-20%']);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.25], [0, 0]);
  const videoOpacity = useTransform(scrollYProgress, [0, 1], [1, 1]);
  
  // Section-specific opacities and offsets
  const section1Opacity = useTransform(scrollYProgress, [0, 1.0], [1, 1]);
  const marqueeOpacity = useTransform(scrollYProgress, [0.04, 0.1], [0, 1]);
  const signatureOpacity = useTransform(scrollYProgress, [0.15, 0.18, 1.0], [0, 1, 1]);
  const signatureScale = useTransform(scrollYProgress, [0.15, 0.38], [0.92, 1]);
  const signaturePathLength = useTransform(scrollYProgress, [0.15, 0.38], [0, 1]);
  
  // Scene coordination: After shrinking, the whole "Landing" scene moves up
  const sceneY = useTransform(scrollYProgress, [0.45, 0.64], ['0%', '-100%']);
  
  const manifestoOpacity = useTransform(scrollYProgress, [0.50, 0.58, FINAL_SCROLL_PROGRESS], [0, 1, 1]);
  const manifestoY = useTransform(scrollYProgress, [0.50, 0.68, MANIFESTO_EXIT_START, MANIFESTO_EXIT_END, FINAL_SCROLL_PROGRESS], ['100%', '0%', '0%', '-125%', '-125%']);
  const galleryOpacity = useTransform(scrollYProgress, [GALLERY_REVEAL_START, GALLERY_REVEAL_END, FINAL_SCROLL_PROGRESS], [0, 1, 1]);
  const galleryX = useTransform(scrollYProgress, [GALLERY_REVEAL_START, FINAL_SCROLL_PROGRESS], ['86vw', GALLERY_FINAL_X]);
  const galleryBgColor = useTransform(scrollYProgress, [GALLERY_REVEAL_END, 0.955, FINAL_SCROLL_PROGRESS], ['#182015', '#aeb4a8', '#f4f3ed']);
  const galleryLineOpacity = useTransform(scrollYProgress, [GALLERY_REVEAL_END, 0.955, FINAL_SCROLL_PROGRESS], [0.08, 0.12, 0.18]);
  const galleryTextColor = useTransform(scrollYProgress, [GALLERY_REVEAL_END, 0.955, FINAL_SCROLL_PROGRESS], ['#eef1e7', '#3a4235', '#20271d']);
  const gallerySubTextColor = useTransform(scrollYProgress, [GALLERY_REVEAL_END, 0.955, FINAL_SCROLL_PROGRESS], ['#aeb4a8', '#5a6255', '#3a4235']);

  // Background Darkening & Effects - Clean dark transition at the end
  const bgBrightness = useTransform(scrollYProgress, [0.0, 0.92, FINAL_SCROLL_PROGRESS], [0.95, 0.80, 0.88]);
  const endOverlayOpacity = useTransform(scrollYProgress, [0.52, 0.82, 0.90, FINAL_SCROLL_PROGRESS], [0, 0.78, 0.22, 0]);
  const frostVignette = useTransform(scrollYProgress, [0, 0.5, 0.7, 0.95, 1.0], [0, 0, 0, 0, 0]);
  const nameColor = useTransform(scrollYProgress, [0.08, 0.38, 0.82, FINAL_SCROLL_PROGRESS], ['#000000', '#ffffff', '#20271d', '#20271d']);
  const topUIScale = useTransform(scrollYProgress, [0.08, 0.38], [1, 0.9]);
  const topUIOpacity = 1;

  const [isHeaderLogoHovered, setIsHeaderLogoHovered] = useState(false);
  const headerLogoColor = useTransform(scrollYProgress, [0.05, 0.15], ['#ffffff', '#0ea5e9']);
  
  // Opacity of the top-center header iconic mark container (disappears at 0.05, reappears at 0.15->0.25)
  const headerIconicMarkOpacity = useTransform(scrollYProgress, [0, 0.05, 0.15, 0.25], [1, 0, 0, 1]);

  // Y displacement: moves the header logo and label lower when they reappear
  const headerLogoY = useTransform(scrollYProgress, [0.05, 0.15], [0, 60]);

  // Scroll undraw animations for the H logo (when not hovered)
  const scrollPathLength = useTransform(scrollYProgress, [0, 0.05, 0.15, 0.25], [1, 0, 0, 1]);
  const scrollFillColor = useTransform(
    scrollYProgress,
    [0, 0.02, 0.15, 0.25],
    ['#ffffff', 'rgba(255,255,255,0)', 'rgba(14,165,233,0)', '#0ea5e9']
  );
  const scrollStrokeColor = useTransform(
    scrollYProgress,
    [0, 0.05, 0.15, 0.25],
    ['#ffffff', '#ffffff', 'rgba(14,165,233,0)', 'rgba(14,165,233,0)']
  );
  const scrollStrokeWidth = useTransform(
    scrollYProgress,
    [0, 0.05, 0.15, 0.25],
    [2.5, 2.5, 0, 0]
  );
  
  const headerLetters = "WHO AM I".split("");

  // Manifesto section developer emblem transforms
  const devEmblemPathLength = useTransform(scrollYProgress, [0.52, 0.65], [0, 1]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const homeVideoRef = useRef<HTMLVideoElement>(null);
  const finalFrameLockedRef = useRef(false);

  useEffect(() => {
    if (homeVideoRef.current) {
      homeVideoRef.current.muted = true;
      homeVideoRef.current.play().catch(err => {
        console.warn("Home page video autoplay failed:", err);
      });
    }
  }, []);

  const [isIceManMode, setIsIceManMode] = useState(false);
  const iceManRef = useRef(false);
  const typedKeys = useRef('');

  const [manifestoSeen, setManifestoSeen] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest >= 0.52 && !manifestoSeen) {
      setManifestoSeen(true);
    }

    const video = homeVideoRef.current;
    if (!video) return;

    if (latest >= VIDEO_FREEZE_SCROLL_PROGRESS) {
      if (!finalFrameLockedRef.current) {
        try {
          lockVideoToFinalFrame(video);
          finalFrameLockedRef.current = true;
        } catch (err) {
          console.warn("Could not lock snow video final frame:", err);
          video.pause();
        }
      }
      return;
    }

    finalFrameLockedRef.current = false;
    if (video.paused) {
      video.play().catch(err => {
        console.warn("Home page video autoplay failed:", err);
      });
    }
  });

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
    let bgVideoFinalFrameLocked = false;

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
      if (currentScroll >= VIDEO_FREEZE_SCROLL_PROGRESS) {
        if (!bgVideoFinalFrameLocked) {
          try {
            lockVideoToFinalFrame(bgVideo);
            bgVideoFinalFrameLocked = true;
          } catch (e) {
            console.warn("Could not lock snow video final frame:", e);
            bgVideo.pause();
          }
        }
      } else {
        bgVideoFinalFrameLocked = false;
        if (bgVideo.paused) {
          bgVideo.play().catch(e => console.warn("Video play failed:", e));
        }
      }

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
    <div ref={scrollRef} className="relative w-full min-h-screen bg-[#0A0F1A]">
      {/* Background Snow Video - Page Wide */}
      <motion.div 
        style={{ 
          opacity: videoOpacity,
          filter: useTransform(
            bgBrightness,
            (brightness) => `brightness(${brightness})`
          )
        }}
        className="fixed inset-0 z-[1] pointer-events-none"
      >
        <video 
          ref={homeVideoRef}
          autoPlay 
          muted 
          loop 
          playsInline 
          className="w-full h-full object-cover"
        >
          <source src={ASSETS.bgVideo} type="video/mp4" />
        </video>
      </motion.div>

      {/* End State Overlay */}
      <motion.div
        className="fixed inset-0 z-[5] pointer-events-none bg-[#0F172A]"
        style={{ opacity: endOverlayOpacity }}
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
            opacity: topUIOpacity
          }}
        >
          <motion.div
            className="pointer-events-auto cursor-pointer flex flex-col pt-1 select-none group leading-[0.7] md:leading-[0.7] gap-0 origin-top-left"
            style={{
              color: nameColor,
              scale: topUIScale
            }}
          >
            <span className="text-3xl md:text-5xl font-normal uppercase lando-link-compact font-press-start">
              <LandoText text="HanYu" className="lando-link-black" />
            </span>
            <span className="text-3xl md:text-5xl font-normal uppercase lando-link-compact font-press-start">
              <LandoText text="Wu" className="lando-link-black" />
            </span>
          </motion.div>

          {/* Top Right: Resume Button & Menu */}
          <motion.div
            className="pointer-events-auto pt-1 flex items-center gap-2 md:gap-3 origin-top-right"
            style={{ scale: topUIScale }}
          >
              {/* Resume Button */}
              <motion.a
                href="/HanYu_Wu_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.98 }}
                className="h-12 md:h-14 px-5 md:px-8 bg-[#0ea5e9] rounded-xl flex items-center justify-center gap-2 md:gap-3 transition-all shadow-[0_4px_12px_rgba(14,165,233,0.3)] text-black group"
              >
                <Download className="w-5 h-5 md:w-6 md:h-6 text-black" />
                <span className="text-xs md:text-sm font-normal uppercase tracking-normal text-black font-press-start">
                  <LandoText text="RESUME" className="lando-link-mono" />
                </span>
              </motion.a>

              {/* Menu Button - Lando Norris Style (Thicker Border & Lines) */}
              <motion.button
                onClick={() => setIsMenuOpen(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-12 h-12 md:w-14 md:h-14 border-[3px] border-[#0ea5e9] bg-slate-950/40 hover:bg-slate-950/60 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_4px_12px_rgba(14,165,233,0.05)] hover:shadow-[0_4px_12px_rgba(14,165,233,0.3)] group/menu"
                aria-label="Menu"
              >
                <div className="w-5 md:w-6 h-[3px] bg-[#D3ECEA] group-hover/menu:bg-[#0ea5e9] transition-colors rounded-full" />
                <div className="w-5 md:w-6 h-[3px] bg-[#D3ECEA] group-hover/menu:bg-[#0ea5e9] transition-colors rounded-full" />
              </motion.button>
          </motion.div>


        </motion.div>



      </div>

      {/* Main Experience Section */}
      <div className="relative w-full z-20" style={{ height: GALLERY_SCROLL_HEIGHT }}>
        <motion.div 
          style={{ opacity: section1Opacity }}
          className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden"
        >
          {/* Landing Scene (Box + Marquee) */}
          <motion.div 
            style={{ y: sceneY }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Top Center: Iconic Mark */}
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 top-4 flex flex-col items-center justify-center gap-2 cursor-pointer pointer-events-auto transition-colors duration-300 select-none z-40"
              onMouseEnter={() => setIsHeaderLogoHovered(true)}
              onMouseLeave={() => setIsHeaderLogoHovered(false)}
              style={{
                color: isHeaderLogoHovered ? '#0ea5e9' : headerLogoColor,
                y: headerLogoY,
                opacity: headerIconicMarkOpacity,
              }}
            >
              <svg 
                width="36" 
                height="36" 
                viewBox="0 0 40 40" 
              >
                <motion.path 
                  d="M10 5L5 35H12L15 20H25L22 35H30L35 5H27L24 18H14L17 5H10Z"
                  animate={isHeaderLogoHovered ? {
                    pathLength: [0, 1],
                    stroke: '#0ea5e9',
                    strokeWidth: 2.5,
                    fill: ['rgba(14,165,233,0)', '#0ea5e9'],
                  } : {
                    pathLength: undefined,
                    stroke: undefined,
                    strokeWidth: undefined,
                    fill: 'rgba(0,0,0,0)',
                  }}
                  style={{
                    pathLength: isHeaderLogoHovered ? undefined : scrollPathLength,
                    stroke: isHeaderLogoHovered ? undefined : scrollStrokeColor,
                    strokeWidth: isHeaderLogoHovered ? undefined : scrollStrokeWidth,
                    fill: isHeaderLogoHovered ? undefined : scrollFillColor,
                  }}
                  transition={isHeaderLogoHovered ? {
                    pathLength: { duration: 0.8, ease: "easeInOut" },
                    fill: { delay: 0.8, duration: 0.4, ease: "easeInOut" }
                  } : {
                    duration: 0.3
                  }}
                />
              </svg>
              <div className="text-[8px] font-black uppercase flex whitespace-nowrap">
                {headerLetters.map((char, index) => {
                  const startScroll = 0.15 + (index * 0.18) / headerLetters.length;
                  const endScroll = startScroll + 0.04;
                  return (
                    <RevealLetter
                      key={index}
                      scrollYProgress={scrollYProgress}
                      start={startScroll}
                      end={endScroll}
                      char={char}
                      isLast={index === headerLetters.length - 1}
                    />
                  );
                })}
              </div>
            </motion.div>
            {/* Dynamic Background Marquee - Now moves with the scene */}
            <motion.div 
              style={{ opacity: marqueeOpacity }}
              className="absolute inset-0 z-5 flex flex-col justify-center overflow-hidden pointer-events-none select-none"
            >
                <motion.div 
                  animate={{ x: [0, -2000] }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  className="whitespace-nowrap font-press-start text-[5.1vw] font-normal uppercase tracking-normal text-blue-950/60 leading-[1.35] mb-1 [word-spacing:1vw]"
                >
                  FULLSTACK SOFTWARE ENGINEER FULLSTACK SOFTWARE ENGINEER FULLSTACK SOFTWARE ENGINEER FULLSTACK SOFTWARE ENGINEER FULLSTACK SOFTWARE ENGINEER
                </motion.div>
                <motion.div 
                  animate={{ x: [-2000, 0] }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                  className="whitespace-nowrap font-press-start text-[5.1vw] font-normal uppercase tracking-normal text-sky-900/40 leading-[1.35] [word-spacing:1vw]"
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

            {/* Signature Overlay - Nested inside the Landing Scene to move and scale together */}
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
          </motion.div>

          {/* Manifesto Text - Moves up into the "new space" from below */}
          <motion.div
            style={{ 
              opacity: manifestoOpacity,
              y: manifestoY
            }}
            className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none p-6 md:p-10 origin-top"
          >
            <div className="max-w-7xl text-center pointer-events-auto group flex flex-col gap-4 md:gap-6 items-center">
              {/* Programmer Laurel Emblem & Text above the quote */}
              <div className="flex flex-col items-center justify-center gap-2 select-none mb-4 md:mb-6">
                <motion.svg 
                  width="54" 
                  height="54" 
                  viewBox="0 0 40 40" 
                  className="text-[#0ea5e9]"
                >
                  <motion.path 
                    d="M 17,17 L 14,20 L 17,23 M 23,17 L 26,20 L 23,23 M 21,15 L 19,25 M 13,16 C 9,12 3,12 1,15 C 3,17 8,19 13,20 M 12,20 C 7,17 2,18 1,21 C 3,23 8,24 12,24 M 12,24 C 7,22 3,23 2,26 C 4,27 8,27 12,27 M 27,16 C 31,12 37,12 39,15 C 37,17 32,19 27,20 M 28,20 C 33,17 38,18 39,21 C 37,23 32,24 28,24 M 28,24 C 33,22 37,23 38,26 C 36,27 32,27 28,27"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    fill="none"
                    style={{
                      pathLength: devEmblemPathLength
                    }}
                  />
                </motion.svg>
                <div className="text-[9px] font-press-start md:text-[10px] font-black uppercase whitespace-nowrap text-[#0ea5e9] tracking-[0.45em] pl-[0.45em]">
                  BUILDING SINCE 2021
                </div>
              </div>
              <h2 className="font-press-start text-[clamp(0.8rem,3.05vw,3.75rem)] font-normal leading-[1.38] tracking-normal uppercase select-none px-4 flex flex-col items-center gap-2 md:gap-3">
                <RevealLine index={0} isVisible={manifestoSeen}>
                  <span className="text-[#0ea5e9]">Challenging</span> <span className="text-[#ffffff]">the market,</span>
                </RevealLine>
                <RevealLine index={1} isVisible={manifestoSeen}>
                  <span className="text-[#ffffff]">building to</span> <span className="text-[#0ea5e9]">scale,</span>
                </RevealLine>
                <RevealLine index={2} isVisible={manifestoSeen}>
                  <span className="text-[#0ea5e9]">driving results</span>
                </RevealLine>
                <RevealLine index={3} isVisible={manifestoSeen}>
                  <span className="text-[#ffffff]">across every vertical.</span>
                </RevealLine>
                <RevealLine index={4} isVisible={manifestoSeen}>
                  <span className="text-[#ffffff]">Shaping an industry</span> <span className="text-[#0ea5e9]">legacy</span>
                </RevealLine>
                <RevealLine index={5} isVisible={manifestoSeen}>
                  <span className="text-[#ffffff]">through</span> <span className="text-[#0ea5e9]">vision, execution,</span>
                </RevealLine>
                <RevealLine index={6} isVisible={manifestoSeen}>
                  <span className="text-[#ffffff]">and</span> <span className="text-[#0ea5e9]">leadership.</span>
                </RevealLine>
              </h2>
            </div>
          </motion.div>

          {/* Scroll Editorial Gallery */}
          <motion.div
            style={{ opacity: galleryOpacity, backgroundColor: galleryBgColor }}
            className="absolute inset-0 z-50 overflow-hidden pointer-events-none"
          >
            <motion.div
              style={{ opacity: galleryLineOpacity }}
              className="absolute inset-0 pointer-events-none"
            >
              <svg viewBox="0 0 1400 900" className="h-full w-full text-[#27311f]">
                {[...Array(10)].map((_, i) => (
                  <path
                    key={i}
                    d={`M${-120 + i * 80},${70 + i * 72} C${180 + i * 50},${-80 + i * 30} ${360 + i * 95},${300 + i * 28} ${660 + i * 50},${160 + i * 42} S${1180 + i * 38},${500 + i * 36} 1520,${170 + i * 54}`}
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="1.2"
                  />
                ))}
              </svg>
            </motion.div>

            <motion.div
              style={{ x: galleryX }}
              className="absolute left-0 top-0 h-[150vh] w-[390vw]"
            >
              <div className="absolute left-[4vw] top-[14vh] max-w-[55vw] select-none">
                <p className="font-press-start text-[9px] uppercase tracking-normal text-[#0ea5e9] mb-5">
                  AFTER BUILDING TO SCALE
                </p>
                <h3 className="text-[12vw] leading-[0.82] font-black uppercase tracking-normal text-[#eef1e7] mix-blend-difference">
                  Across
                  <br />
                  every
                  <br />
                  vertical.
                </h3>
              </div>

              <div className="absolute left-[92vw] top-[30vh] w-[26vw] min-w-[320px] max-w-[440px] select-none">
                <p className="text-[clamp(1.5rem,2.3vw,3rem)] font-black leading-[0.92] tracking-normal text-[#d7d9cf]">
                  The work keeps moving: launched, shipped, refined, and scaled through each scroll.
                </p>
                <div className="mt-8 h-12 w-36 text-[#0ea5e9]">
                  <Stroke className="h-full w-full" color="#0ea5e9" pathLength={1} strokeWidth={3} />
                </div>
              </div>

              {galleryItems.map((item) => (
                <figure
                  key={item.title}
                  style={{
                    left: item.left,
                    top: item.top,
                    width: item.width,
                    minWidth: item.minWidth,
                    maxWidth: item.maxWidth,
                  }}
                  className="absolute select-none pointer-events-auto group cursor-pointer"
                >
                  <figcaption className="mb-3 max-w-full uppercase tracking-normal">
                    <p className="font-press-start text-[8px] leading-[1.6] text-[#0ea5e9]">
                      {item.date}
                    </p>
                    <motion.h4
                      style={{ color: galleryTextColor }}
                      className="mt-2 font-press-start text-[10px] leading-[1.45] transition-colors duration-300 group-hover:text-[#0ea5e9]!"
                    >
                      {item.title}
                    </motion.h4>
                    <motion.p
                      style={{ color: gallerySubTextColor }}
                      className="mt-2 font-press-start text-[6px] leading-[1.7]"
                    >
                      {item.meta}
                    </motion.p>
                  </figcaption>
                  <div className="overflow-hidden rounded-sm border border-[#20271d]/10 bg-black/5 shadow-md transition-all duration-500 ease-out group-hover:border-[#0ea5e9]/40 group-hover:shadow-lg group-hover:shadow-[#0ea5e9]/5">
                    <motion.img
                      src={item.src}
                      alt={item.title}
                      style={{ aspectRatio: item.aspectRatio }}
                      whileHover={{ scale: 1.04 }}
                      transition={{ duration: 0.5, ease: [0.215, 0.61, 0.355, 1] }}
                      className={`w-full object-cover transition-all duration-500 ${item.muted ? 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100' : 'opacity-100'}`}
                    />
                  </div>
                </figure>
              ))}
            </motion.div>
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

      {/* Lando Norris Style Split Section */}
      <section className="relative w-full min-h-screen bg-[#f4f3ed] text-[#20271d] z-20 flex flex-col justify-center items-center overflow-hidden py-24 px-6 md:px-16">
        {/* Background topographic lines SVG (same as overlay) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.03]">
          <svg viewBox="0 0 1000 1000" className="w-full h-full scale-125 text-[#20271d]">
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

        {/* Left Side: Helmet Image */}
        <img 
          src="/left.png" 
          alt="Helmet Artwork" 
          className="absolute left-0 bottom-0 h-[60vh] md:h-[80vh] w-auto object-contain object-left pointer-events-none select-none z-10 opacity-15 lg:opacity-100 transition-opacity duration-300"
        />

        {/* Right Side: Face Image */}
        <img 
          src="/right.png" 
          alt="Face Profile" 
          className="absolute right-0 bottom-0 h-[60vh] md:h-[80vh] w-auto object-contain object-right pointer-events-none select-none z-10 opacity-15 lg:opacity-100 transition-opacity duration-300"
        />

        {/* Center Content */}
        <div className="w-full max-w-6xl mx-auto z-20 flex flex-col items-center justify-center flex-grow py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 w-full px-4">
            {/* GITHUB Column */}
            <div className="flex flex-col items-center text-center group">
              <div className="relative mb-6 select-none h-[14vw] md:h-[7vw] min-h-[70px] flex items-center justify-center">
                <span className="font-outfit font-black text-[12vw] md:text-[5vw] leading-none uppercase tracking-tighter text-[#e1e4da] transition-transform duration-500 group-hover:scale-102">
                  GITHUB
                </span>
                <span className="absolute font-serif italic text-[14vw] md:text-[6vw] leading-none text-[#d1ff00] -rotate-6 translate-x-4 -translate-y-2 mix-blend-difference drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-105">
                  Hub
                </span>
              </div>
              <p className="font-sans text-sm md:text-base text-[#3a4235] max-w-[280px] leading-relaxed mb-6">
                Explore source code, personal projects, repositories, and developer contributions.
              </p>
              <a 
                href="https://github.com/HanYu-Wu04" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-12 h-12 bg-[#d1ff00] hover:bg-[#bcff00] text-black rounded-lg flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 pointer-events-auto cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-0.5 transition-transform duration-300">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            {/* LINKEDIN Column */}
            <div className="flex flex-col items-center text-center group">
              <div className="relative mb-6 select-none h-[14vw] md:h-[7vw] min-h-[70px] flex items-center justify-center">
                <span className="font-outfit font-black text-[12vw] md:text-[5vw] leading-none uppercase tracking-tighter text-[#e1e4da] transition-transform duration-500 group-hover:scale-102">
                  LINKEDIN
                </span>
                <span className="absolute font-serif italic text-[14vw] md:text-[6vw] leading-none text-[#d1ff00] -rotate-6 translate-x-4 -translate-y-2 mix-blend-difference drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-105">
                  In
                </span>
              </div>
              <p className="font-sans text-sm md:text-base text-[#3a4235] max-w-[280px] leading-relaxed mb-6">
                Connect for professional networking, career updates, and industry experience.
              </p>
              <a 
                href="https://www.linkedin.com/in/hanyu-wu04/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-12 h-12 bg-[#d1ff00] hover:bg-[#bcff00] text-black rounded-lg flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 pointer-events-auto cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-0.5 transition-transform duration-300">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            {/* CONTACT Column */}
            <div className="flex flex-col items-center text-center group">
              <div className="relative mb-6 select-none h-[14vw] md:h-[7vw] min-h-[70px] flex items-center justify-center">
                <span className="font-outfit font-black text-[12vw] md:text-[5vw] leading-none uppercase tracking-tighter text-[#e1e4da] transition-transform duration-500 group-hover:scale-102">
                  CONTACT
                </span>
                <span className="absolute font-serif italic text-[14vw] md:text-[6vw] leading-none text-[#d1ff00] -rotate-6 translate-x-4 -translate-y-2 mix-blend-difference drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-105">
                  Mail
                </span>
              </div>
              <p className="font-sans text-sm md:text-base text-[#3a4235] max-w-[280px] leading-relaxed mb-6">
                Reach out directly for freelance inquiries, collaborations, or general questions.
              </p>
              <a 
                href="mailto:hanyuwu04@gmail.com" 
                className="w-12 h-12 bg-[#d1ff00] hover:bg-[#bcff00] text-black rounded-lg flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 pointer-events-auto cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-0.5 transition-transform duration-300">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Grain Finish */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat z-[100]" />

      <AnimatePresence>
        {isMenuOpen && (
          <MenuOverlay 
            onClose={() => setIsMenuOpen(false)} 
            topUIScale={topUIScale}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FluidDistortion;
