import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTrackingStore } from '@/store/useTrackingStore';
import { EARTH_RADIUS, getAltitudeOffset } from '@/utils/coordinates';

const DEFAULT_CAM = new THREE.Vector3(0, 1.5, 5.5);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

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

function slerpVectors(a: THREE.Vector3, b: THREE.Vector3, t: number, minRadius: number): THREE.Vector3 {
  const aDir = a.clone().normalize();
  const bDir = b.clone().normalize();
  const aLen = a.length();
  const bLen = b.length();
  let dot = Math.max(-1, Math.min(1, aDir.dot(bDir)));
  const omega = Math.acos(dot);
  let dir: THREE.Vector3;
  if (omega < 0.001) {
    dir = aDir.clone().lerp(bDir, t).normalize();
  } else {
    const sinOmega = Math.sin(omega);
    const sA = Math.sin((1 - t) * omega) / sinOmega;
    const sB = Math.sin(t * omega) / sinOmega;
    dir = aDir.clone().multiplyScalar(sA).add(bDir.clone().multiplyScalar(sB)).normalize();
  }
  const baseR = aLen + (bLen - aLen) * t;
  const arcLift = Math.sin(t * Math.PI) * Math.max(0, omega * 0.6);
  const r = Math.max(baseR + arcLift, minRadius);
  return dir.multiplyScalar(r);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface CameraAnimatorProps {
  controlsRef: React.RefObject<any>;
}

export function CameraAnimator({ controlsRef }: CameraAnimatorProps) {
  const { camera, gl } = useThree();
  const selectedObject = useTrackingStore((s) => s.selectedObject);
  const setSelectedObject = useTrackingStore((s) => s.setSelectedObject);

  const animating = useRef(false);
  const progress = useRef(0);
  const DURATION = 1.5;

  const startCamPos = useRef(new THREE.Vector3());
  const targetCamPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const targetTarget = useRef(new THREE.Vector3());
  const prevSelectedId = useRef<string | null>(null);
  const autoRotateTimer = useRef<ReturnType<typeof setTimeout>>();

  const startFlyAnimation = useCallback((camDest: THREE.Vector3, targetDest: THREE.Vector3) => {
    if (!controlsRef.current) return;
    startCamPos.current.copy(camera.position);
    targetCamPos.current.copy(camDest);
    startTarget.current.copy(controlsRef.current.target);
    targetTarget.current.copy(targetDest);
    progress.current = 0;
    animating.current = true;
    controlsRef.current.autoRotate = false;
    if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
  }, [camera, controlsRef]);

  // Fly TO selected object
  useEffect(() => {
    if (!selectedObject || !controlsRef.current) return;
    if (selectedObject.id === prevSelectedId.current) return;
    prevSelectedId.current = selectedObject.id;

    const altOff = getAltitudeOffset(selectedObject.type, selectedObject.altitude);
    const objPos = latLonToVec3(selectedObject.latitude, selectedObject.longitude, altOff);
    const dir = objPos.clone().normalize();
    const camDist = selectedObject.type === 'satellite' ? 4.2 : 3.5;
    const newCamPos = objPos.clone().add(dir.clone().multiplyScalar(camDist));

    startFlyAnimation(newCamPos, objPos);
  }, [selectedObject, startFlyAnimation]);

  // Fly BACK on deselect
  useEffect(() => {
    if (selectedObject === null && prevSelectedId.current !== null) {
      prevSelectedId.current = null;
      startFlyAnimation(DEFAULT_CAM.clone(), DEFAULT_TARGET.clone());
    }
  }, [selectedObject, startFlyAnimation]);

  // Escape key deselects
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useTrackingStore.getState().selectedObject) {
        setSelectedObject(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setSelectedObject]);

  // Click on empty space (missed all meshes) deselects
  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downTime = 0;

    const onPointerDown = () => { downTime = Date.now(); };
    const onPointerUp = (e: PointerEvent) => {
      // Only treat short clicks (not drags)
      if (Date.now() - downTime > 300) return;
      if (!useTrackingStore.getState().selectedObject) return;

      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      // Check if we hit any tracking marker (small meshes with userData.trackingId)
      const scene = camera.parent;
      if (!scene) return;
      const intersects = raycaster.intersectObjects(scene.children, true);
      const hitMarker = intersects.some((i) => i.object.userData?.trackingId);
      if (!hitMarker) {
        setSelectedObject(null);
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl, camera, setSelectedObject]);

  useFrame((_, delta) => {
    if (!animating.current || !controlsRef.current) return;

    progress.current += delta / DURATION;
    const t = Math.min(progress.current, 1);
    const ease = easeInOutCubic(t);

    camera.position.copy(slerpVectors(startCamPos.current, targetCamPos.current, ease, EARTH_RADIUS + 0.5));
    controlsRef.current.target.copy(slerpVectors(startTarget.current, targetTarget.current, ease, 0));
    controlsRef.current.update();

    if (t >= 1) {
      animating.current = false;
      autoRotateTimer.current = setTimeout(() => {
        if (controlsRef.current) controlsRef.current.autoRotate = true;
      }, 3000);
    }
  });

  return null;
}
