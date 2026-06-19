import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { X, Download } from 'lucide-react';
import LandoText from './LandoText';

interface MenuOverlayProps {
  onClose: () => void;
  topUIScale: any;
}

const curtainTransition = {
  duration: 0.74,
  ease: [0.76, 0, 0.24, 1] as const,
};

const contentVariants = {
  hidden: { y: -24 },
  visible: {
    y: 0,
    transition: {
      duration: 0.74,
      ease: [0.76, 0, 0.24, 1] as const,
      delay: 0.04,
    },
  },
  exit: {
    y: -22,
    transition: {
      duration: 0.74,
      ease: [0.76, 0, 0.24, 1] as const,
    },
  },
};

const revealItem = (delay = 0) => ({
  initial: { clipPath: 'inset(0 0 100% 0)', y: -10 },
  animate: {
    clipPath: 'inset(0 0 0% 0)',
    y: 0,
    transition: {
      clipPath: { duration: 0.58, ease: [0.76, 0, 0.24, 1] as const, delay },
      y: { duration: 0.58, ease: [0.76, 0, 0.24, 1] as const, delay },
    },
  },
  exit: {
    clipPath: 'inset(0 0 100% 0)',
    y: -10,
    transition: {
      clipPath: { duration: 0.48, ease: [0.76, 0, 0.24, 1] as const, delay: Math.max(0, delay * 0.35) },
      y: { duration: 0.48, ease: [0.76, 0, 0.24, 1] as const, delay: Math.max(0, delay * 0.35) },
    },
  },
});

const MenuOverlay: React.FC<MenuOverlayProps> = ({ onClose, topUIScale }) => {
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);

  const mouseValY = useMotionValue(0);
  const springY = useSpring(mouseValY, { damping: 40, stiffness: 150 });
  
  // Transform values for left and right columns (moves opposite directions)
  const leftColY = useTransform(springY, [-1, 1], [40, -40]);
  const rightColY = useTransform(springY, [-1, 1], [-40, 40]);

  // Playing background video initialization
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Disable background scroll
    document.body.style.overflow = 'hidden';

    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.play().catch(err => {
        console.warn("Overlay video autoplay failed:", err);
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      const normalizedY = (e.clientY / window.innerHeight) * 2 - 1;
      mouseValY.set(normalizedY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mouseValY]);

  const menuLinks = [
    { name: 'HOME', href: '#', onClick: (e: React.MouseEvent) => { e.preventDefault(); onClose(); } },
    { name: 'GITHUB', href: 'https://github.com/HanYu-Wu04', target: '_blank', rel: 'noopener noreferrer' },
    { name: 'LINKEDIN', href: 'https://www.linkedin.com/in/hanyu-wu04/', target: '_blank', rel: 'noopener noreferrer' },
    { name: 'CONTACT', href: 'mailto:hanyuwu04@gmail.com' },
  ];

  return (
    <motion.div
      initial={{ clipPath: 'inset(0 0 100% 0)', y: '-6%' }}
      animate={{ clipPath: 'inset(0 0 0% 0)', y: '0%' }}
      exit={{ clipPath: 'inset(0 0 100% 0)', y: '-8%' }}
      transition={curtainTransition}
      className="fixed inset-0 z-[200] bg-[#0A0F1A] select-none overflow-hidden"
    >
      <motion.div
        initial={{ y: '-4px', opacity: 0 }}
        animate={{ y: '100vh', opacity: 1 }}
        exit={{ y: '-4px', opacity: 1 }}
        transition={curtainTransition}
        className="absolute left-0 right-0 top-0 z-[80] h-[3px] bg-[#0ea5e9] shadow-[0_-10px_26px_rgba(14,165,233,0.45)]"
      />

      {/* Background: playing snow.mp4 */}
      <motion.div
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute inset-0 z-[1] pointer-events-none select-none"
      >
        <video
          ref={videoRef}
          src="/snow.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-35"
        />
      </motion.div>

      {/* Top Header UI - Match position, styles, and scale of FluidDistortion header */}
      <motion.div
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute top-0 left-0 right-0 z-50 select-none pointer-events-none px-2 pt-2 md:px-4 md:pt-4 flex justify-between items-start"
      >
        {/* Top Left Logo/Name */}
        <motion.div
          {...revealItem(0.06)}
          className="pointer-events-auto cursor-pointer flex flex-col pt-1 select-none group leading-[0.7] md:leading-[0.7] gap-0 origin-top-left"
          style={{
            color: '#ffffff',
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

        {/* Top Right Buttons: Resume & Close */}
        <motion.div
          {...revealItem(0.12)}
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

          {/* Close Button - Thicker border like hamburger */}
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-12 h-12 md:w-14 md:h-14 border-[3px] border-[#0ea5e9] bg-slate-950/40 hover:bg-slate-950/60 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-[0_4px_12px_rgba(14,165,233,0.05)] hover:shadow-[0_4px_12px_rgba(14,165,233,0.3)] group/close"
            aria-label="Close menu"
          >
            <X className="w-5 md:w-6 h-5 md:h-6 text-[#0ea5e9] group-hover/close:text-white transition-colors" />
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Left Section: 4 Images in a two-column grid */}
      <motion.div
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="hidden lg:flex absolute inset-y-0 left-0 w-[48%] items-center justify-center gap-6 p-8 overflow-hidden pointer-events-none z-10"
      >
        {/* Column 1 - Left Column (moves down when cursor moves up) */}
        <motion.div 
          style={{ y: leftColY }} 
          className="flex flex-col gap-6 w-[250px] xl:w-[300px]"
        >
          {/* Image 1: top.png (HOME) */}
          <motion.div {...revealItem(0.12)} style={{ aspectRatio: '15 / 16' }} className="relative rounded-none overflow-hidden shadow-2xl border border-white/5 bg-slate-950/20">
            <img 
              src="/top.png" 
              alt="Home Preview" 
              className={`w-full h-full object-cover transition-all duration-700 ${
                activeHoverIndex === 0 ? 'grayscale-0 scale-[1.04] opacity-100' : 
                activeHoverIndex === null ? 'grayscale opacity-50' : 'grayscale opacity-20'
              }`}
            />
          </motion.div>
          {/* Image 2: github.png (GITHUB) */}
          <motion.div {...revealItem(0.24)} style={{ aspectRatio: '15 / 16' }} className="relative rounded-none overflow-hidden shadow-2xl border border-white/5 bg-slate-950/20">
            <img 
              src="/github.png" 
              alt="GitHub Profile Preview" 
              className={`w-full h-full object-cover transition-all duration-700 ${
                activeHoverIndex === 1 ? 'grayscale-0 scale-[1.04] opacity-100' : 
                activeHoverIndex === null ? 'grayscale opacity-50' : 'grayscale opacity-20'
              }`}
            />
          </motion.div>
        </motion.div>

        {/* Column 2 - Right Column (moves up when cursor moves up) */}
        <motion.div 
          style={{ y: rightColY }} 
          className="flex flex-col gap-6 w-[250px] xl:w-[300px] pt-12"
        >
          {/* Image 3: linkedin.jpeg (LINKEDIN) */}
          <motion.div {...revealItem(0.18)} style={{ aspectRatio: '15 / 16' }} className="relative rounded-none overflow-hidden shadow-2xl border border-white/5 bg-slate-950/20">
            <img 
              src="/linkedin.jpeg" 
              alt="LinkedIn Profile Preview" 
              className={`w-full h-full object-cover transition-all duration-700 ${
                activeHoverIndex === 2 ? 'grayscale-0 scale-[1.04] opacity-100' : 
                activeHoverIndex === null ? 'grayscale opacity-50' : 'grayscale opacity-20'
              }`}
            />
          </motion.div>
          {/* Image 4: base.png (CONTACT) */}
          <motion.div {...revealItem(0.30)} style={{ aspectRatio: '15 / 16' }} className="relative rounded-none overflow-hidden shadow-2xl border border-white/5 bg-slate-950/20">
            <img 
              src="/base.png" 
              alt="Contact Preview" 
              className={`w-full h-full object-cover transition-all duration-700 ${
                activeHoverIndex === 3 ? 'grayscale-0 scale-[1.04] opacity-100' : 
                activeHoverIndex === null ? 'grayscale opacity-50' : 'grayscale opacity-20'
              }`}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Right Section: Vertical Menu Links (Centered) */}
      <motion.div
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute inset-y-0 right-0 w-full lg:w-[52%] flex flex-col justify-center items-center z-10"
      >
        {/* Links Container */}
        <div className="flex flex-col items-center gap-0">
          {menuLinks.map((link, index) => (
            <motion.div key={index} {...revealItem(0.14 + index * 0.09)} className="relative py-0 flex flex-col items-center justify-center w-full">
              <a
                href={link.href}
                target={link.target}
                rel={link.rel}
                onClick={link.onClick}
                className="group text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal font-press-start uppercase tracking-normal text-white/95 hover:text-[#0ea5e9] transition-colors cursor-pointer leading-[0.9] z-10 text-center"
                onMouseEnter={() => setActiveHoverIndex(index)}
                onMouseLeave={() => setActiveHoverIndex(null)}
              >
                <LandoText text={link.name} className="lando-link-mono" />
              </a>

              {/* Lando Norris strike-through effect: wavy drawing line */}
              {activeHoverIndex === index && (
                <motion.svg
                  className="absolute left-1/2 -translate-x-1/2 w-[120%] h-6 pointer-events-none text-[#0ea5e9] drop-shadow-[0_0_8px_rgba(14,165,233,0.8)] z-0"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <path 
                    d="M 0,5 Q 5,2 10,5 T 20,5 T 30,5 T 40,5 T 50,5 T 60,5 T 70,5 T 80,5 T 90,5 T 100,5" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                  />
                </motion.svg>
              )}
            </motion.div>
          ))}

          {/* Programmer laurels emblem at the bottom of links */}
          <motion.div {...revealItem(0.52)} className="flex flex-col items-center gap-1 select-none mt-8 border-t border-white/10 pt-6 w-full max-w-xs opacity-75 text-center">
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 40 40" 
              className="text-[#0ea5e9]"
            >
              <path 
                d="M 17,17 L 14,20 L 17,23 M 23,17 L 26,20 L 23,23 M 21,15 L 19,25 M 13,16 C 9,12 3,12 1,15 C 3,17 8,19 13,20 M 12,20 C 7,17 2,18 1,21 C 3,23 8,24 12,24 M 12,24 C 7,22 3,23 2,26 C 4,27 8,27 12,27 M 27,16 C 31,12 37,12 39,15 C 37,17 32,19 27,20 M 28,20 C 33,17 38,18 39,21 C 37,23 32,24 28,24 M 28,24 C 33,22 37,23 38,26 C 36,27 32,27 28,27"
                stroke="currentColor"
                strokeWidth={1.5}
                fill="none"
              />
            </svg>
            <span className="text-[9px] font-black uppercase text-[#0ea5e9] tracking-widest mt-1">
              BUILDING SINCE 2021
            </span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MenuOverlay;
