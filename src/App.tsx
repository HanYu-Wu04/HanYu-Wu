/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import FluidDistortion from './components/FluidDistortion';
import LoadingOverlay from './components/LoadingOverlay';

export default function App() {
  return (
    <main className="min-h-screen bg-black">
      <FluidDistortion />
      <LoadingOverlay />
    </main>
  );
}
