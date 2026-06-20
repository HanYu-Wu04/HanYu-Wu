/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import FluidDistortion from './components/FluidDistortion';
import FluidCursor from './components/FluidCursor';
import LoadingOverlay from './components/LoadingOverlay';

export default function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <main className="min-h-screen bg-black">
      <FluidDistortion key={isMobile ? 'mobile' : 'desktop'} />
      <FluidCursor />
      <LoadingOverlay />
    </main>
  );
}
