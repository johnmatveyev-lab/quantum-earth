export const EARTH_RADIUS = 2;

export function latLonToVec3(lat: number, lon: number, altitude: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const r = EARTH_RADIUS + altitude;
  return [
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];
}

export function getAltitudeOffset(type: 'aircraft' | 'satellite' | 'rocket', altitude: number): number {
  switch (type) {
    case 'aircraft': return 0.02 + (altitude / 15) * 0.04;
    case 'satellite': return 0.2 + (altitude / 2000) * 0.5;
    case 'rocket': return 0.05 + (altitude / 600) * 0.2;
    default: return 0.03;
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return a + diff * t;
}
