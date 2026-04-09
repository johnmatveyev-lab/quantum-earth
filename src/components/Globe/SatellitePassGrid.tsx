import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { EARTH_RADIUS } from '@/utils/coordinates';

interface SatellitePassGridProps {
  visible: boolean;
}

type GridLine = {
  points: [number, number, number][];
  color: string;
  opacity: number;
};

function latLonToVec3(latDeg: number, lonDeg: number, radius: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(lat);

  return [
    -radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    radius * cosLat * Math.sin(lon),
  ];
}

function buildLatitudeLine(latDeg: number, radius: number): [number, number, number][] {
  const points: [number, number, number][] = [];
  for (let lon = -180; lon <= 180; lon += 4) {
    points.push(latLonToVec3(latDeg, lon, radius));
  }
  return points;
}

function buildLongitudeLine(lonDeg: number, radius: number): [number, number, number][] {
  const points: [number, number, number][] = [];
  for (let lat = -85; lat <= 85; lat += 3) {
    points.push(latLonToVec3(lat, lonDeg, radius));
  }
  return points;
}

function buildInclinedPass(inclDeg: number, nodeDeg: number, radius: number): [number, number, number][] {
  const points: [number, number, number][] = [];
  const incl = (inclDeg * Math.PI) / 180;
  const node = (nodeDeg * Math.PI) / 180;

  for (let i = 0; i <= 360; i += 3) {
    const u = (i * Math.PI) / 180;
    const x = radius * (Math.cos(node) * Math.cos(u) - Math.sin(node) * Math.sin(u) * Math.cos(incl));
    const y = radius * (Math.sin(u) * Math.sin(incl));
    const z = radius * (Math.sin(node) * Math.cos(u) + Math.cos(node) * Math.sin(u) * Math.cos(incl));
    points.push([x, y, z]);
  }

  return points;
}

function DashedPath({ points, color, opacity }: GridLine) {
  const lineObject = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));

    const material = new THREE.LineDashedMaterial({
      color,
      transparent: true,
      opacity,
      dashSize: 0.08,
      gapSize: 0.06,
      depthWrite: false,
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }, [points, color, opacity]);

  useEffect(() => {
    return () => {
      lineObject.geometry.dispose();
      if (Array.isArray(lineObject.material)) {
        lineObject.material.forEach((m) => m.dispose());
      } else {
        lineObject.material.dispose();
      }
    };
  }, [lineObject]);

  return <primitive object={lineObject} />;
}

export function SatellitePassGrid({ visible }: SatellitePassGridProps) {
  const lines = useMemo<GridLine[]>(() => {
    if (!visible) return [];

    const radius = EARTH_RADIUS + 0.22;
    const output: GridLine[] = [];

    // Geospatial grid
    for (let lat = -60; lat <= 60; lat += 30) {
      output.push({
        points: buildLatitudeLine(lat, radius),
        color: '#42c7ff',
        opacity: lat === 0 ? 0.28 : 0.16,
      });
    }

    for (let lon = -180; lon < 180; lon += 30) {
      output.push({
        points: buildLongitudeLine(lon, radius),
        color: '#42c7ff',
        opacity: lon === 0 ? 0.24 : 0.14,
      });
    }

    // Representative satellite pass families
    [53, 70, 86].forEach((inclination, index) => {
      const passColor = index === 0 ? '#7f9bff' : index === 1 ? '#5ce0c8' : '#f6c45f';
      for (let node = 0; node < 360; node += 45) {
        output.push({
          points: buildInclinedPass(inclination, node, radius + index * 0.015),
          color: passColor,
          opacity: 0.13,
        });
      }
    });

    return output;
  }, [visible]);

  if (!visible || lines.length === 0) return null;

  return (
    <group>
      {lines.map((line, i) => (
        <DashedPath
          key={`pass-grid-${i}`}
          points={line.points}
          color={line.color}
          opacity={line.opacity}
        />
      ))}
    </group>
  );
}
