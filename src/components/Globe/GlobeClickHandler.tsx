import { useCallback } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { useTrackingStore } from '@/store/useTrackingStore';
import { EARTH_RADIUS } from '@/utils/coordinates';

export function GlobeClickHandler() {
  const setCameraFeedLocation = useTrackingStore(s => s.setCameraFeedLocation);
  const setStreetViewLocation = useTrackingStore(s => s.setStreetViewLocation);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    // Don't intercept if TrackingLayer already handled (stopPropagation)
    if (!e.point) return;

    const { x, y, z } = e.point;
    const r = Math.sqrt(x * x + y * y + z * z);

    // Inverse of latLonToVec3
    const lat = 90 - Math.acos(y / r) * (180 / Math.PI);
    const theta = Math.atan2(z, -x);
    let lon = theta * (180 / Math.PI) - 180;
    if (lon < -180) lon += 360;
    if (lon > 180) lon -= 360;

    setCameraFeedLocation({ lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 });
    setStreetViewLocation({ lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 });
  }, [setCameraFeedLocation, setStreetViewLocation]);

  return (
    <mesh onClick={handleClick}>
      <sphereGeometry args={[EARTH_RADIUS + 0.001, 64, 32]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
