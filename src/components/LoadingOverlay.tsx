import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const MIN_LOADER_MS = 1300;
const H_MARK_PATH =
  'M-10 -15L-15 15H-8L-5 0H5L2 15H10L15 -15H7L4 -2H-6L-3 -15H-10Z';

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
  const [isRevealing, setIsRevealing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let revealTimeout: number | undefined;

    Promise.all([
      wait(MIN_LOADER_MS),
      waitForWindowLoad(),
      preloadVideoMetadata('/snow.mp4'),
      ...imageAssets.map(preloadImage),
    ]).then(() => {
      if (isMounted) {
        setIsRevealing(true);
        revealTimeout = window.setTimeout(() => {
          if (isMounted) {
            setIsVisible(false);
          }
        }, 980);
      }
    });

    return () => {
      isMounted = false;
      if (revealTimeout) {
        window.clearTimeout(revealTimeout);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden text-white"
        >
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="-500 -500 1000 1000"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <defs>
              <mask id="loading-h-reveal-mask">
                <rect x="-5000" y="-5000" width="10000" height="10000" fill="white" />
                <motion.path
                  d={H_MARK_PATH}
                  fill="black"
                  initial={{ scale: 2.7, rotate: -4 }}
                  animate={{
                    scale: isRevealing ? 170 : 2.7,
                    rotate: isRevealing ? -7 : 0,
                  }}
                  transition={{ duration: 0.94, ease: [0.76, 0, 0.24, 1] }}
                />
              </mask>
            </defs>
            <rect
              x="-5000"
              y="-5000"
              width="10000"
              height="10000"
              fill="#0ea5e9"
              mask="url(#loading-h-reveal-mask)"
            />
          </svg>

          <motion.svg
            width="96"
            height="96"
            viewBox="0 0 40 40"
            initial={{ scale: 0.86, rotate: -4, opacity: 0 }}
            animate={{
              scale: isRevealing ? 72 : 1,
              rotate: isRevealing ? -7 : 0,
              opacity: isRevealing ? 0 : 1,
            }}
            transition={{
              scale: { duration: isRevealing ? 0.94 : 0.78, ease: [0.76, 0, 0.24, 1] },
              rotate: { duration: isRevealing ? 0.94 : 0.78, ease: [0.76, 0, 0.24, 1] },
              opacity: { duration: isRevealing ? 0.34 : 0.34, ease: 'easeOut' },
            }}
            className="relative z-10 drop-shadow-[0_8px_18px_rgba(17,24,39,0.24)]"
            aria-hidden="true"
          >
            <path
              d="M10 5L5 35H12L15 20H25L22 35H30L35 5H27L24 18H14L17 5H10Z"
              fill="currentColor"
            />
          </motion.svg>

          <motion.div
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: isRevealing ? 8 : 0, opacity: isRevealing ? 0 : 1 }}
            transition={{ duration: 0.38, ease: 'easeOut', delay: 0.12 }}
            className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 font-press-start text-[11px] uppercase tracking-normal"
          >
            LOADING...
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
