import { useMemo, useRef, useCallback, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TrackableObject } from '@/data/types';
import { useTrackingStore } from '@/store/useTrackingStore';
import { EARTH_RADIUS, getAltitudeOffset } from '@/utils/coordinates';

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

const TYPE_COLORS: Record<TrackableObject['type'], THREE.Color> = {
  aircraft: new THREE.Color('#00d4ff'),
  satellite: new THREE.Color('#22dda0'),
  rocket: new THREE.Color('#ff8800'),
  vessel: new THREE.Color('#a78bfa'),
};

function getColor(type: TrackableObject['type']): THREE.Color {
  return (TYPE_COLORS[type] || TYPE_COLORS.aircraft).clone();
}

interface TrackingLayerProps {
  objects: TrackableObject[];
}

function TrackingLayerInner({ objects }: TrackingLayerProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.InstancedMesh>(null);
  const { setSelectedObject, setHoveredObject, hoveredObject, selectedObject, addComparedObject } = useTrackingStore();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const prevPositions = useRef<Map<string, THREE.Vector3>>(new Map());
  const prevColors = useRef<Map<string, string>>(new Map());
  const time = useRef(0);
  const lastHoverTime = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current || !glowRef.current || !ringRef.current) return;
    time.current += delta;

    const currentIds = new Set(objects.map((obj) => obj.id));
    prevPositions.current.forEach((_, id) => {
      if (!currentIds.has(id)) {
        prevPositions.current.delete(id);
        prevColors.current.delete(id);
      }
    });

    let colorsChanged = false;

    objects.forEach((obj, i) => {
      const altOff = getAltitudeOffset(obj.type, obj.altitude);
      const target = latLonToVec3(obj.latitude, obj.longitude, altOff);

      const prev = prevPositions.current.get(obj.id);
      let pos: THREE.Vector3;
      if (prev) {
        const damping = obj.type === 'satellite' ? 14 : 10;
        const alpha = 1 - Math.exp(-damping * delta);
        pos = prev.clone().lerp(target, alpha);
        if (pos.distanceToSquared(target) > 5) pos = target;
      } else {
        pos = target;
      }
      prevPositions.current.set(obj.id, pos.clone());

      const isHovered = hoveredObject?.id === obj.id;
      const isSelected = selectedObject?.id === obj.id;
      const baseScale =
        obj.type === 'aircraft' ? 0.013 :
        obj.type === 'satellite' ? 0.015 :
        obj.type === 'vessel' ? 0.014 : 0.02;
      const pulse = isSelected ? 1 + Math.sin(time.current * 3) * 0.25 : 1;
      const hoverScale = isHovered ? 1.8 : 1;
      const scale = baseScale * pulse * hoverScale;

      dummy.position.copy(pos);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      const colorKey = `${obj.type}-${isHovered || isSelected ? 'hi' : 'lo'}`;
      if (prevColors.current.get(obj.id) !== colorKey) {
        prevColors.current.set(obj.id, colorKey);
        colorsChanged = true;
        const c = getColor(obj.type);
        if (isHovered || isSelected) c.multiplyScalar(2.5);
        meshRef.current!.setColorAt(i, c);

        const gc = getColor(obj.type);
        gc.multiplyScalar(isSelected ? 0.6 : 0.3);
        glowRef.current!.setColorAt(i, gc);
      }

      const glowMult = isHovered || isSelected ? 5 : 3.5;
      dummy.scale.setScalar(scale * glowMult);
      dummy.updateMatrix();
      glowRef.current!.setMatrixAt(i, dummy.matrix);

      if (isSelected) {
        const ringScale = scale * 8 + Math.sin(time.current * 2) * scale * 2;
        dummy.scale.set(ringScale, ringScale, ringScale * 0.1);
        dummy.lookAt(0, 0, 0);
        dummy.updateMatrix();
        ringRef.current!.setMatrixAt(i, dummy.matrix);
        if (prevColors.current.get(obj.id + '-ring') !== 'sel') {
          prevColors.current.set(obj.id + '-ring', 'sel');
          ringRef.current!.setColorAt(i, getColor(obj.type));
        }
      } else {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        ringRef.current!.setMatrixAt(i, dummy.matrix);
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (colorsChanged && meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    glowRef.current.instanceMatrix.needsUpdate = true;
    if (colorsChanged && glowRef.current.instanceColor) glowRef.current.instanceColor.needsUpdate = true;
    ringRef.current.instanceMatrix.needsUpdate = true;
    if (colorsChanged && ringRef.current.instanceColor) ringRef.current.instanceColor.needsUpdate = true;
    meshRef.current.count = objects.length;
    glowRef.current.count = objects.length;
    ringRef.current.count = objects.length;
  });

  const handlePointerMove = useCallback((e: any) => {
    e.stopPropagation?.();
    const now = performance.now();
    if (now - lastHoverTime.current < 50) return;
    lastHoverTime.current = now;
    const instanceId = e.instanceId;
    if (instanceId !== undefined && instanceId < objects.length) {
      setHoveredObject(objects[instanceId]);
      document.body.style.cursor = 'pointer';
    }
  }, [objects, setHoveredObject]);

  const handlePointerLeave = useCallback(() => {
    setHoveredObject(null);
    document.body.style.cursor = 'default';
  }, [setHoveredObject]);

  const handleClick = useCallback((e: any) => {
    e.stopPropagation?.();
    const instanceId = e.instanceId;
    if (instanceId !== undefined && instanceId < objects.length) {
      if (e.nativeEvent?.shiftKey) {
        addComparedObject(objects[instanceId]);
      } else {
        setSelectedObject(objects[instanceId]);
      }
    }
  }, [objects, setSelectedObject, addComparedObject]);

  const maxCount = Math.max(objects.length, 1);

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, maxCount]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <instancedMesh ref={glowRef} args={[undefined, undefined, maxCount]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          transparent
          opacity={0.12}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      <instancedMesh ref={ringRef} args={[undefined, undefined, maxCount]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial
          transparent
          opacity={0.3}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  );
}

export const TrackingLayer = memo(TrackingLayerInner);
