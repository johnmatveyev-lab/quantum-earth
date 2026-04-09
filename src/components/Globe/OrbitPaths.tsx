import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS } from '@/utils/coordinates';
import { Line } from '@react-three/drei';

interface OrbitPathsProps {
  visible: boolean;
}

export function OrbitPaths({ visible }: OrbitPathsProps) {
  const groupRef = useRef<THREE.Group>(null);

  const orbits = useMemo(() => {
    if (!visible) return [];

    const rings: { points: [number,number,number][]; color: string; opacity: number; dash: boolean }[] = [];

    // LEO orbits at various inclinations
    const configs = [
      { alt: 0.22, incl: 28, color: '#00ccff', opacity: 0.05 },
      { alt: 0.28, incl: 45, color: '#00bbee', opacity: 0.06 },
      { alt: 0.33, incl: 55, color: '#00aadd', opacity: 0.055 },
      { alt: 0.38, incl: 72, color: '#0099cc', opacity: 0.05 },
      { alt: 0.42, incl: 85, color: '#0088bb', opacity: 0.04 },
      // Starlink-like planes
      { alt: 0.30, incl: 53, color: '#7744ff', opacity: 0.04 },
      { alt: 0.31, incl: 53.2, color: '#6633ee', opacity: 0.035 },
    ];

    configs.forEach(({ alt, incl, color, opacity }) => {
      const r = EARTH_RADIUS + alt;
      const inclRad = (incl * Math.PI) / 180;
      const pts: [number,number,number][] = [];

      for (let i = 0; i <= 160; i++) {
        const angle = (i / 160) * Math.PI * 2;
        pts.push([
          r * Math.cos(angle),
          r * Math.sin(angle) * Math.sin(inclRad),
          r * Math.sin(angle) * Math.cos(inclRad),
        ]);
      }

      rings.push({ points: pts, color, opacity, dash: false });
    });

    // MEO orbit
    const meoR = EARTH_RADIUS + 0.6;
    const meoPts: [number,number,number][] = [];
    for (let i = 0; i <= 160; i++) {
      const angle = (i / 160) * Math.PI * 2;
      meoPts.push([
        meoR * Math.cos(angle),
        meoR * Math.sin(angle) * Math.sin(Math.PI / 4),
        meoR * Math.sin(angle) * Math.cos(Math.PI / 4),
      ]);
    }
    rings.push({ points: meoPts, color: '#22dda0', opacity: 0.04, dash: true });

    // GEO reference ring
    const geoR = EARTH_RADIUS + 1.2;
    const geoPts: [number,number,number][] = [];
    for (let i = 0; i <= 160; i++) {
      const angle = (i / 160) * Math.PI * 2;
      geoPts.push([geoR * Math.cos(angle), 0, geoR * Math.sin(angle)]);
    }
    rings.push({ points: geoPts, color: '#ffaa00', opacity: 0.025, dash: true });

    return rings;
  }, [visible]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.003;
    }
  });

  if (!visible || orbits.length === 0) return null;

  return (
    <group ref={groupRef}>
      {orbits.map((orbit, i) => (
        <Line
          key={i}
          points={orbit.points}
          color={orbit.color}
          transparent
          opacity={orbit.opacity}
          lineWidth={orbit.dash ? 0.3 : 0.5}
          depthWrite={false}
        />
      ))}
    </group>
  );
}
