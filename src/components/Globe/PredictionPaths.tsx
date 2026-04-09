import { useMemo, useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useTrackingStore } from '@/store/useTrackingStore';
import { EARTH_RADIUS, getAltitudeOffset } from '@/utils/coordinates';

// Extend Three.js elements for R3F
extend({ Line_: THREE.Line });

function latLonToVec3(lat: number, lon: number, alt: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const r = EARTH_RADIUS + alt;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function predictPositions(lat: number, lon: number, heading: number, speed: number, alt: number, type: string, steps = 20) {
  const points: THREE.Vector3[] = [];
  const kmPerDeg = 111.32;
  const altOff = getAltitudeOffset(type as any, alt);
  
  for (let i = 1; i <= steps; i++) {
    const dt = i * 60;
    const dist = (speed / 3600) * dt;
    const dLat = (dist * Math.cos(heading * Math.PI / 180)) / kmPerDeg;
    const dLon = (dist * Math.sin(heading * Math.PI / 180)) / (kmPerDeg * Math.cos(lat * Math.PI / 180));
    points.push(latLonToVec3(lat + dLat, lon + dLon, altOff));
  }
  return points;
}

interface PredictionPathsProps {
  visible: boolean;
}

export function PredictionPaths({ visible }: PredictionPathsProps) {
  const { selectedObject } = useTrackingStore();
  const groupRef = useRef<THREE.Group>(null);

  const lineObj = useMemo(() => {
    if (!visible || !selectedObject) return null;
    
    const points = predictPositions(
      selectedObject.latitude,
      selectedObject.longitude,
      selectedObject.heading,
      selectedObject.speed,
      selectedObject.altitude,
      selectedObject.type
    );
    
    if (points.length < 2) return null;

    const colorMap: Record<string, string> = { aircraft: '#00d4ff', satellite: '#22dda0', rocket: '#ff8800' };
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: colorMap[selectedObject.type] || '#ffffff',
      transparent: true,
      opacity: 0.4,
      toneMapped: false,
    });
    return new THREE.Line(geometry, material);
  }, [visible, selectedObject?.id, selectedObject?.latitude, selectedObject?.longitude, selectedObject?.heading]);

  if (!visible || !lineObj) return null;

  return (
    <group ref={groupRef}>
      <primitive object={lineObj} />
    </group>
  );
}
