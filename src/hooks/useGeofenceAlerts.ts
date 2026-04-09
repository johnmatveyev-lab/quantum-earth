import { useEffect, useRef, useCallback } from 'react';
import { useTrackingStore } from '@/store/useTrackingStore';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/** Check if a point is inside a polygon using ray-casting algorithm */
function pointInPolygon(lat: number, lon: number, polygon: { lat: number; lon: number }[]): boolean {
    if (polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lon;
        const xj = polygon[j].lat, yj = polygon[j].lon;
        const intersect = ((yi > lon) !== (yj > lon)) &&
            (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/** Track which objects were inside geofences in the previous check */
const prevInsideMap = new Map<string, Set<string>>();

export function useGeofenceAlerts() {
    const { aircraft, satellites, rockets, geofences } = useTrackingStore();
    const { user } = useAuth();
    const lastCheckRef = useRef(0);

    const checkGeofences = useCallback(() => {
        if (geofences.length === 0) return;

        const allObjects = [...aircraft, ...satellites, ...rockets];

        for (const fence of geofences) {
            if (!fence.active || fence.polygon.length < 3) continue;

            const currentInside = new Set<string>();
            const prevInside = prevInsideMap.get(fence.id) || new Set();

            for (const obj of allObjects) {
                const inside = pointInPolygon(obj.latitude, obj.longitude, fence.polygon);
                if (inside) currentInside.add(obj.id);

                // Enter detection
                if (inside && !prevInside.has(obj.id) && fence.alertOnEnter) {
                    toast({
                        title: `📍 Geofence Enter: ${fence.name}`,
                        description: `${obj.name} entered "${fence.name}"`,
                    });
                    // Persist alert to DB
                    if (user) {
                        supabase.from('alerts').insert({
                            user_id: user.id,
                            alert_type: 'geofence_enter',
                            title: `Geofence Enter: ${fence.name}`,
                            description: `${obj.name} (${obj.type}) entered "${fence.name}"`,
                            object_id: obj.id,
                        }).then(() => { });
                    }
                }

                // Exit detection
                if (!inside && prevInside.has(obj.id) && fence.alertOnExit) {
                    toast({
                        title: `📍 Geofence Exit: ${fence.name}`,
                        description: `${obj.name} exited "${fence.name}"`,
                    });
                    if (user) {
                        supabase.from('alerts').insert({
                            user_id: user.id,
                            alert_type: 'geofence_exit',
                            title: `Geofence Exit: ${fence.name}`,
                            description: `${obj.name} (${obj.type}) exited "${fence.name}"`,
                            object_id: obj.id,
                        }).then(() => { });
                    }
                }
            }

            prevInsideMap.set(fence.id, currentInside);
        }
    }, [aircraft, satellites, rockets, geofences, user]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastCheckRef.current > 25000) {
                lastCheckRef.current = now;
                checkGeofences();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [checkGeofences]);
}
