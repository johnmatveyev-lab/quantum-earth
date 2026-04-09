import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Earth } from './Earth';
import { Starfield } from './Starfield';
import { TrackingLayer } from './TrackingLayer';
import { OrbitPaths } from './OrbitPaths';
import { CameraAnimator } from './CameraAnimator';
import { FlightTrails } from './FlightTrails';
import { SatellitePassGrid } from './SatellitePassGrid';
import { PredictionPaths } from './PredictionPaths';
import { GlobeClickHandler } from './GlobeClickHandler';
import { GeofenceDrawer } from './GeofenceDrawer';
import { GeofenceRenderer } from './GeofenceRenderer';
import { BloomEffect } from './BloomEffect';
import { useTrackingStore } from '@/store/useTrackingStore';
import { Suspense, useRef, useEffect, useState } from 'react';

export function GlobeScene() {
  const { aircraft, satellites, rockets, vessels, showAircraft, showSatellites, showRockets, showVessels, activeLayers } = useTrackingStore();
  const showOrbits = activeLayers.has('orbits');
  const showPassGrid = activeLayers.has('corridors');
  const showPredictions = activeLayers.has('predictions');
  const controlsRef = useRef<any>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Throttle rendering when tab not visible
  useEffect(() => {
    const onVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const visibleObjects = [
    ...(showAircraft ? aircraft : []),
    ...(showSatellites ? satellites : []),
    ...(showRockets ? rockets : []),
    ...(showVessels ? vessels : []),
  ];

  return (
    <Canvas
      camera={{ position: [0, 1.5, 5.5], fov: 45 }}
      style={{ position: 'absolute', inset: 0 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: 3,
        toneMappingExposure: 1.3,
      }}
      dpr={[1, 1.5]}
      frameloop={isVisible ? 'always' : 'demand'}
    >
      <color attach="background" args={['#020810']} />
      <fog attach="fog" args={['#020810', 35, 120]} />

      <ambientLight intensity={0.08} />
      <directionalLight position={[5, 3, 4]} intensity={1.8} color="#a0c8ff" />
      <directionalLight position={[-4, -2, -3]} intensity={0.25} color="#2244aa" />
      <pointLight position={[0, 0, 8]} intensity={0.25} color="#4488ff" />
      <pointLight position={[-6, 4, -2]} intensity={0.1} color="#6644cc" />
      <pointLight position={[3, -5, 3]} intensity={0.08} color="#226688" />

      <Suspense fallback={null}>
        <Earth />
        <Starfield />
        <OrbitPaths visible={showOrbits && showSatellites} />
        <SatellitePassGrid visible={showPassGrid && showSatellites} />
        <PredictionPaths visible={showPredictions} />
        {showAircraft && <FlightTrails aircraft={aircraft} />}
        <TrackingLayer objects={visibleObjects} />
        <GeofenceRenderer />
        <GeofenceDrawer />
        <GlobeClickHandler />
      </Suspense>

      <BloomEffect />

      <CameraAnimator controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={2.8}
        maxDistance={18}
        rotateSpeed={0.35}
        zoomSpeed={0.6}
        enableDamping
        dampingFactor={0.03}
        autoRotate
        autoRotateSpeed={0.12}
      />
    </Canvas>
  );
}
