import { useThree, useFrame } from '@react-three/fiber';
import { useTrackingStore } from '@/store/useTrackingStore';
import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';

const GLOBE_RADIUS = 2;
const GEOFENCE_COLORS = ['#00d4ff', '#a855f7', '#f97316', '#22c55e', '#ef4444', '#eab308'];

function latLonFromVec3(vec: THREE.Vector3): { lat: number; lon: number } {
    const normalized = vec.clone().normalize();
    const lat = Math.asin(normalized.y) * (180 / Math.PI);
    const lon = Math.atan2(-normalized.z, normalized.x) * (180 / Math.PI);
    return { lat, lon };
}

function vec3FromLatLon(lat: number, lon: number, radius = GLOBE_RADIUS + 0.005): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

export function GeofenceDrawer() {
    const { geofenceDrawMode, addGeofence } = useTrackingStore();
    const [points, setPoints] = useState<{ lat: number; lon: number }[]>([]);
    const { raycaster, camera, scene } = useThree();
    const meshRef = useRef<THREE.Mesh>(null);
    const lineRef = useRef<THREE.Line>(null);
    const lastClickTime = useRef(0);

    const handleClick = useCallback((event: any) => {
        if (!geofenceDrawMode) return;

        // Prevent processing if not clicking on the globe mesh
        const intersects = raycaster.intersectObjects(scene.children, true);
        const globeHit = intersects.find((i) => {
            const obj = i.object;
            return obj.type === 'Mesh' && obj.userData.isGlobe;
        });
        if (!globeHit) return;

        const now = Date.now();
        const isDoubleClick = now - lastClickTime.current < 400;
        lastClickTime.current = now;

        if (isDoubleClick && points.length >= 3) {
            // Complete the geofence
            const color = GEOFENCE_COLORS[Math.floor(Math.random() * GEOFENCE_COLORS.length)];
            const name = `Geofence ${new Date().toLocaleTimeString()}`;
            addGeofence({
                id: crypto.randomUUID(),
                name,
                polygon: points,
                alertOnEnter: true,
                alertOnExit: true,
                color,
                active: true,
            });
            setPoints([]);
            useTrackingStore.getState().toggleGeofenceDrawMode();
            return;
        }

        const point = latLonFromVec3(globeHit.point);
        setPoints((prev) => [...prev, point]);
    }, [geofenceDrawMode, points, raycaster, scene, addGeofence]);

    // Render the in-progress polygon line
    useFrame(() => {
        if (!lineRef.current) return;
        const geometry = lineRef.current.geometry as THREE.BufferGeometry;

        if (points.length < 2) {
            geometry.setFromPoints([]);
            return;
        }

        const verts = points.map((p) => vec3FromLatLon(p.lat, p.lon));
        // Close the loop
        verts.push(verts[0]);
        geometry.setFromPoints(verts);
        geometry.computeBoundingSphere();
    });

    if (!geofenceDrawMode) return null;

    return (
        <group>
            {/* Invisible click capture sphere */}
            <mesh
                ref={meshRef}
                onClick={handleClick}
                userData={{ isGeofenceCapture: true }}
            >
                <sphereGeometry args={[GLOBE_RADIUS + 0.01, 64, 64]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* In-progress line */}
            <line ref={lineRef as any}>
                <bufferGeometry />
                <lineBasicMaterial color="#00d4ff" linewidth={2} transparent opacity={0.8} />
            </line>

            {/* Vertex dots */}
            {points.map((p, i) => {
                const pos = vec3FromLatLon(p.lat, p.lon);
                return (
                    <mesh key={i} position={pos}>
                        <sphereGeometry args={[0.015, 8, 8]} />
                        <meshBasicMaterial color="#00d4ff" />
                    </mesh>
                );
            })}
        </group>
    );
}
