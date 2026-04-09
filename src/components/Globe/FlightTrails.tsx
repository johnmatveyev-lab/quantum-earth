import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TrackableObject } from '@/data/types';
import { EARTH_RADIUS, getAltitudeOffset } from '@/utils/coordinates';

const TRAIL_LENGTH = 64; // number of points per trail
const MAX_AIRCRAFT = 160;

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

const trailVertexShader = `
  attribute float alpha;
  varying float vAlpha;
  void main() {
    vAlpha = alpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const trailFragmentShader = `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor, vAlpha * 0.55);
  }
`;

interface FlightTrailsProps {
  aircraft: TrackableObject[];
}

export function FlightTrails({ aircraft }: FlightTrailsProps) {
  // Store trail history: Map<id, Vector3[]>
  const trailHistory = useRef<Map<string, THREE.Vector3[]>>(new Map());
  const groupRef = useRef<THREE.Group>(null);
  const sampleTimer = useRef(0);

  // Pre-build line objects
  const { lines, materials } = useMemo(() => {
    const lines: THREE.Line[] = [];
    const materials: THREE.ShaderMaterial[] = [];

    for (let i = 0; i < MAX_AIRCRAFT; i++) {
      const positions = new Float32Array(TRAIL_LENGTH * 3);
      const alphas = new Float32Array(TRAIL_LENGTH);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

      const material = new THREE.ShaderMaterial({
        vertexShader: trailVertexShader,
        fragmentShader: trailFragmentShader,
        uniforms: { uColor: { value: new THREE.Color('#00d4ff') } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const line = new THREE.Line(geometry, material);
      line.frustumCulled = false;
      line.visible = false;
      lines.push(line);
      materials.push(material);
    }

    return { lines, materials };
  }, []);

  // Attach lines to group once
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Attach lines lazily
    if (groupRef.current.children.length === 0) {
      lines.forEach((l) => groupRef.current!.add(l));
    }

    sampleTimer.current += delta;
    const shouldSample = sampleTimer.current >= 0.3; // sample every 300ms
    if (shouldSample) sampleTimer.current = 0;

    const activeIds = new Set<string>();

    aircraft.forEach((obj, i) => {
      if (i >= MAX_AIRCRAFT) return;
      activeIds.add(obj.id);

      const altOff = getAltitudeOffset('aircraft', obj.altitude);
      const pos = latLonToVec3(obj.latitude, obj.longitude, altOff);

      let history = trailHistory.current.get(obj.id);
      if (!history) {
        history = [];
        trailHistory.current.set(obj.id, history);
      }

      if (shouldSample) {
        // Only add if moved enough
        const last = history.length > 0 ? history[history.length - 1] : null;
        if (!last || last.distanceToSquared(pos) > 0.00001) {
          history.push(pos.clone());
          if (history.length > TRAIL_LENGTH) history.shift();
        }
      }

      const line = lines[i];
      line.visible = history.length > 1;

      if (history.length > 1) {
        const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        const alphaAttr = line.geometry.getAttribute('alpha') as THREE.BufferAttribute;

        for (let j = 0; j < TRAIL_LENGTH; j++) {
          if (j < history.length) {
            const p = history[j];
            posAttr.setXYZ(j, p.x, p.y, p.z);
            // Fade: oldest = 0, newest = 1
            alphaAttr.setX(j, j / (history.length - 1));
          } else {
            // Park unused vertices at last known position
            const last = history[history.length - 1];
            posAttr.setXYZ(j, last.x, last.y, last.z);
            alphaAttr.setX(j, 0);
          }
        }

        posAttr.needsUpdate = true;
        alphaAttr.needsUpdate = true;
        line.geometry.setDrawRange(0, history.length);
      }
    });

    // Hide lines for aircraft no longer visible
    for (let i = aircraft.length; i < MAX_AIRCRAFT; i++) {
      lines[i].visible = false;
    }

    // Clean up old trail history
    trailHistory.current.forEach((_, id) => {
      if (!activeIds.has(id)) trailHistory.current.delete(id);
    });
  });

  return <group ref={groupRef} />;
}
