import { useTrackingStore } from '@/store/useTrackingStore';
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

const GLOBE_RADIUS = 2;

function vec3FromLatLon(lat: number, lon: number, radius = GLOBE_RADIUS + 0.004): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

function GeofencePolygon({ polygon, color, active }: {
    polygon: { lat: number; lon: number }[];
    color: string;
    active: boolean;
}) {
    const lineObj = useRef<THREE.Line | null>(null);

    const vertices = useMemo(() => {
        if (polygon.length < 2) return [];
        const verts = polygon.map((p) => vec3FromLatLon(p.lat, p.lon));
        verts.push(verts[0]); // close the loop
        return verts;
    }, [polygon]);

    // Build the line object
    const lineObject = useMemo(() => {
        if (vertices.length < 2) return null;
        const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
        const material = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
        });
        const line = new THREE.Line(geometry, material);
        lineObj.current = line;
        return line;
    }, [vertices, color]);

    // Pulse animation
    useFrame(({ clock }) => {
        if (!lineObj.current) return;
        const mat = lineObj.current.material as THREE.LineBasicMaterial;
        if (active) {
            mat.opacity = 0.5 + Math.sin(clock.elapsedTime * 2) * 0.2;
        } else {
            mat.opacity = 0.25;
        }
    });

    if (!lineObject) return null;

    return (
        <group>
            <primitive object={lineObject} />

            {/* Vertex markers */}
            {polygon.map((p, i) => {
                const pos = vec3FromLatLon(p.lat, p.lon);
                return (
                    <mesh key={i} position={pos}>
                        <sphereGeometry args={[0.01, 6, 6]} />
                        <meshBasicMaterial color={color} transparent opacity={0.8} />
                    </mesh>
                );
            })}
        </group>
    );
}

export function GeofenceRenderer() {
    const geofences = useTrackingStore((s) => s.geofences);

    if (geofences.length === 0) return null;

    return (
        <group>
            {geofences.map((fence) => (
                <GeofencePolygon
                    key={fence.id}
                    polygon={fence.polygon}
                    color={fence.color}
                    active={fence.active}
                />
            ))}
        </group>
    );
}
