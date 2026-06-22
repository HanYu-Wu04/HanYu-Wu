/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import FluidDistortion from './components/FluidDistortion';
import FluidCursor from './components/FluidCursor';
import LoadingOverlay from './components/LoadingOverlay';

export default function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isSceneReady, setIsSceneReady] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsSceneReady(false);
  }, [isMobile]);

  const handleSceneReady = useCallback(() => {
    setIsSceneReady(true);
  }, []);

  return (
    <main className="min-h-screen bg-black">
      <FluidDistortion key={isMobile ? 'mobile' : 'desktop'} onSceneReady={handleSceneReady} />
      <FluidCursor />
      <LoadingOverlay isReady={isSceneReady} />
    </main>
  );
}
