import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const MIN_LOADER_MS = 650;
const H_MARK_PATH =
  'M-10 -15L-15 15H-8L-5 0H5L2 15H10L15 -15H7L4 -2H-6L-3 -15H-10Z';
const criticalImageAssets = ['/base.png', '/top.png'];
const buildingFrames = ['', '.', '..', '...'];

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function preloadImage(src: string, pendingImages: HTMLImageElement[]) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    pendingImages.push(image);

    const finish = () => {
      const pendingIndex = pendingImages.indexOf(image);
      if (pendingIndex !== -1) {
        pendingImages.splice(pendingIndex, 1);
      }
      resolve();
    };

    image.onload = finish;
    image.onerror = finish;
    image.src = src;
  });
}

type LoadingOverlayProps = {
  isReady: boolean;
}

export default function LoadingOverlay({ isReady }: LoadingOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isRevealing, setIsRevealing] = useState(false);
  const [hasMetMinimumDuration, setHasMetMinimumDuration] = useState(false);
  const [hasLoadedCriticalImages, setHasLoadedCriticalImages] = useState(false);
  const [buildingFrame, setBuildingFrame] = useState(0);
  const hasStartedReveal = useRef(false);

  useEffect(() => {
    let isMounted = true;

    wait(MIN_LOADER_MS).then(() => {
      if (isMounted) {
        setHasMetMinimumDuration(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const pendingImages: HTMLImageElement[] = [];

    Promise.all(criticalImageAssets.map((src) => preloadImage(src, pendingImages)))
      .then(waitForNextFrame)
      .then(waitForNextFrame)
      .then(() => {
        if (isMounted) {
          setHasLoadedCriticalImages(true);
        }
      });

    return () => {
      isMounted = false;
      pendingImages.length = 0;
    };
  }, []);

  useEffect(() => {
    const canReveal = isReady || hasLoadedCriticalImages;

    if (!canReveal || !hasMetMinimumDuration || hasStartedReveal.current) {
      return;
    }

    hasStartedReveal.current = true;
    setIsRevealing(true);
  }, [hasLoadedCriticalImages, hasMetMinimumDuration, isReady]);

  useEffect(() => {
    if (!isRevealing) {
      return;
    }

    const revealTimeout = window.setTimeout(() => {
      setIsVisible(false);
    }, 980);

    return () => {
      window.clearTimeout(revealTimeout);
    };
  }, [isRevealing]);

  useEffect(() => {
    if (isRevealing) {
      return;
    }

    const frameInterval = window.setInterval(() => {
      setBuildingFrame((currentFrame) => (currentFrame + 1) % buildingFrames.length);
    }, 320);

    return () => {
      window.clearInterval(frameInterval);
    };
  }, [isRevealing]);

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
            className="absolute bottom-10 left-1/2 z-10 w-[180px] -translate-x-1/2 text-center font-press-start text-[11px] uppercase tracking-normal"
          >
            BUILDING<span className="inline-block w-[3ch] text-left">{buildingFrames[buildingFrame]}</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
