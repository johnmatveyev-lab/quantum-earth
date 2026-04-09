import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Starfield() {
  const layer1 = useRef<THREE.Points>(null);
  const layer2 = useRef<THREE.Points>(null);
  const layer3 = useRef<THREE.Points>(null);
  const dustRef = useRef<THREE.Points>(null);

  // Deep stars - distant
  const [pos1, col1] = useMemo(() => {
    const count = 6000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 50 + Math.random() * 180;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);

      // Color variation: warm white, blue-white, pale yellow
      const temp = Math.random();
      if (temp < 0.5) { col[i*3]=0.85; col[i*3+1]=0.88; col[i*3+2]=1.0; }
      else if (temp < 0.8) { col[i*3]=1.0; col[i*3+1]=0.95; col[i*3+2]=0.85; }
      else { col[i*3]=0.95; col[i*3+1]=0.92; col[i*3+2]=1.0; }
    }
    return [pos, col];
  }, []);

  // Mid stars - closer, brighter
  const pos2 = useMemo(() => {
    const count = 2000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 35 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  // Nebula/galaxy clusters
  const nebulaPositions = useMemo(() => {
    const count = 1200;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    // Create 4 nebula clusters
    const clusters = [
      { x: 80, y: 40, z: -100, spread: 40, color: [0.1, 0.15, 0.4] },
      { x: -60, y: -30, z: -120, spread: 50, color: [0.2, 0.08, 0.3] },
      { x: 40, y: -60, z: -90, spread: 35, color: [0.08, 0.2, 0.35] },
      { x: -100, y: 50, z: -80, spread: 45, color: [0.15, 0.1, 0.35] },
    ];

    for (let i = 0; i < count; i++) {
      const cluster = clusters[i % clusters.length];
      pos[i*3] = cluster.x + (Math.random() - 0.5) * cluster.spread * 2;
      pos[i*3+1] = cluster.y + (Math.random() - 0.5) * cluster.spread * 2;
      pos[i*3+2] = cluster.z + (Math.random() - 0.5) * cluster.spread;

      const brightness = 0.5 + Math.random() * 0.5;
      col[i*3] = cluster.color[0] * brightness;
      col[i*3+1] = cluster.color[1] * brightness;
      col[i*3+2] = cluster.color[2] * brightness;
    }
    return { pos, col };
  }, []);

  // Cosmic dust particles
  const dustPositions = useMemo(() => {
    const count = 400;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 10 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (layer1.current) layer1.current.rotation.y += delta * 0.002;
    if (layer2.current) layer2.current.rotation.y += delta * 0.004;
    if (layer3.current) layer3.current.rotation.y += delta * 0.001;
    if (dustRef.current) {
      dustRef.current.rotation.y += delta * 0.006;
      dustRef.current.rotation.x += delta * 0.002;
    }
  });

  return (
    <group>
      {/* Deep stars with color */}
      <points ref={layer1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pos1, 3]} />
          <bufferAttribute attach="attributes-color" args={[col1, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.1}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Mid-layer brighter stars */}
      <points ref={layer2}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pos2, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.18}
          color="#dde6ff"
          transparent
          opacity={0.7}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Nebula clusters */}
      <points ref={layer3}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nebulaPositions.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[nebulaPositions.col, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.2}
          vertexColors
          transparent
          opacity={0.12}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Cosmic dust - close, subtle */}
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          color="#6688bb"
          transparent
          opacity={0.2}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
