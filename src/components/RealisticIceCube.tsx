import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface IceCubeProps {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  text?: string;
  opacity?: number;
  distortion?: number;
  thickness?: number;
}

const RealisticIceCube: React.FC<IceCubeProps> = ({ 
  position, 
  scale, 
  rotation = [0, 0, 0], 
  text, 
  opacity = 1,
  distortion = 0.2, // kept for prop compatibility but physical mat doesn't use it same way
  thickness = 1.0
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group position={position} scale={scale} rotation={rotation}>
      <RoundedBox args={[1, 1, 1]} radius={0.06} smoothness={1} ref={meshRef}>
        <meshPhysicalMaterial
          thickness={0.5}
          transmission={1.0}
          roughness={0.02}
          reflectivity={1.0}
          clearcoat={1}
          clearcoatRoughness={0}
          ior={1.31}
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.1}
          transparent
          opacity={opacity}
          metalness={0.0}
        />
      </RoundedBox>
    </group>
  );
};

export default RealisticIceCube;
