import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const MIN_LOADER_MS = 1300;

const imageAssets = [
  '/base.png',
  '/top.png',
  '/github.png',
  '/linkedin.jpeg',
];

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}

function preloadVideoMetadata(src: string) {
  return new Promise<void>((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => resolve();
    video.onerror = () => resolve();
    video.src = src;
  });
}

function waitForWindowLoad() {
  if (document.readyState === 'complete') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    window.addEventListener('load', () => resolve(), { once: true });
  });
}

export default function LoadingOverlay() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      wait(MIN_LOADER_MS),
      waitForWindowLoad(),
      preloadVideoMetadata('/snow.mp4'),
      ...imageAssets.map(preloadImage),
    ]).then(() => {
      if (isMounted) {
        setIsVisible(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut', delay: 0.52 }}
          className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden bg-[#c8ff00] text-[#111827]"
        >
          <motion.svg
            width="96"
            height="96"
            viewBox="0 0 40 40"
            initial={{ scale: 0.86, rotate: -4, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 34, rotate: -7, opacity: 0 }}
            transition={{
              scale: { duration: 0.78, ease: [0.76, 0, 0.24, 1] },
              rotate: { duration: 0.78, ease: [0.76, 0, 0.24, 1] },
              opacity: { duration: 0.34, ease: 'easeOut' },
            }}
            className="drop-shadow-[0_8px_18px_rgba(17,24,39,0.24)]"
            aria-hidden="true"
          >
            <path
              d="M10 5L5 35H12L15 20H25L22 35H30L35 5H27L24 18H14L17 5H10Z"
              fill="currentColor"
            />
          </motion.svg>

          <motion.div
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.38, ease: 'easeOut', delay: 0.12 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 font-press-start text-[11px] uppercase tracking-normal"
          >
            LOADING...
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
