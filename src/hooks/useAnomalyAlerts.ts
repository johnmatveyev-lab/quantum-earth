import { useEffect, useRef, useState, useCallback } from 'react';
import { useTrackingStore } from '@/store/useTrackingStore';
import { toast } from '@/hooks/use-toast';

export interface Anomaly {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  objectName?: string;
  read: boolean;
}

export function useAnomalyAlerts() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const lastCheckRef = useRef(0);
  const { aircraft, satellites, rockets } = useTrackingStore();

  const checkAnomalies = useCallback(() => {
    const now = Date.now();
    const newAnomalies: Anomaly[] = [];

    // Detect aircraft at unusual altitudes
    aircraft.forEach(a => {
      if (a.altitude > 15 && a.status === 'active') {
        newAnomalies.push({
          id: `alt-${a.id}-${now}`,
          title: 'Unusual Altitude',
          description: `${a.name} at ${a.altitude.toFixed(1)}km — above normal flight ceiling`,
          severity: 'medium',
          timestamp: now,
          objectName: a.name,
          read: false,
        });
      }
    });

    // Detect stationary satellites (speed near zero)
    satellites.forEach(s => {
      if (s.speed < 100 && s.status === 'orbiting') {
        newAnomalies.push({
          id: `vel-${s.id}-${now}`,
          title: 'Low Velocity Satellite',
          description: `${s.name} velocity ${s.speed.toFixed(0)} km/h — possible orbital decay`,
          severity: 'high',
          timestamp: now,
          objectName: s.name,
          read: false,
        });
      }
    });

    // Detect rockets descending unexpectedly
    rockets.forEach(r => {
      if (r.status === 'descending' && r.altitude > 100) {
        newAnomalies.push({
          id: `desc-${r.id}-${now}`,
          title: 'Rocket Descent Detected',
          description: `${r.name} descending at ${r.altitude.toFixed(0)}km altitude`,
          severity: 'low',
          timestamp: now,
          objectName: r.name,
          read: false,
        });
      }
    });

    // Detect sudden speed changes (aircraft going very slow or very fast)
    aircraft.forEach(a => {
      if (a.speed > 1200 && a.status === 'active') {
        newAnomalies.push({
          id: `fast-${a.id}-${now}`,
          title: 'Supersonic Aircraft',
          description: `${a.name} at ${a.speed.toFixed(0)} km/h — exceeding Mach 1`,
          severity: 'high',
          timestamp: now,
          objectName: a.name,
          read: false,
        });
      }
      if (a.speed < 50 && a.speed > 0 && a.altitude > 3) {
        newAnomalies.push({
          id: `slow-${a.id}-${now}`,
          title: 'Extremely Slow Aircraft',
          description: `${a.name} at ${a.speed.toFixed(0)} km/h at ${a.altitude.toFixed(1)}km — possible hover or stall`,
          severity: 'medium',
          timestamp: now,
          objectName: a.name,
          read: false,
        });
      }
    });

    // Detect formation flying (multiple aircraft within ~0.5° of each other)
    for (let i = 0; i < aircraft.length; i++) {
      for (let j = i + 1; j < Math.min(aircraft.length, i + 20); j++) {
        const dlat = Math.abs(aircraft[i].latitude - aircraft[j].latitude);
        const dlon = Math.abs(aircraft[i].longitude - aircraft[j].longitude);
        const dalt = Math.abs(aircraft[i].altitude - aircraft[j].altitude);
        if (dlat < 0.3 && dlon < 0.3 && dalt < 1) {
          newAnomalies.push({
            id: `form-${aircraft[i].id}-${aircraft[j].id}-${now}`,
            title: 'Possible Formation',
            description: `${aircraft[i].name} and ${aircraft[j].name} flying in close proximity`,
            severity: 'low',
            timestamp: now,
            objectName: aircraft[i].name,
            read: false,
          });
          break; // Only report once per object
        }
      }
    }

    if (newAnomalies.length > 0) {
      setAnomalies(prev => [...newAnomalies, ...prev].slice(0, 50));
      // Show toast for high severity
      const high = newAnomalies.filter(a => a.severity === 'high');
      if (high.length > 0) {
        toast({
          title: `⚠️ ${high[0].title}`,
          description: high[0].description,
          variant: 'destructive',
        });
      }
    }
  }, [aircraft, satellites, rockets]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastCheckRef.current > 55000) {
        lastCheckRef.current = now;
        checkAnomalies();
      }
    }, 60000);

    // Initial check after 10s
    const timeout = setTimeout(() => {
      lastCheckRef.current = Date.now();
      checkAnomalies();
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [checkAnomalies]);

  const markRead = useCallback((id: string) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  }, []);

  const markAllRead = useCallback(() => {
    setAnomalies(prev => prev.map(a => ({ ...a, read: true })));
  }, []);

  const unreadCount = anomalies.filter(a => !a.read).length;

  return { anomalies, unreadCount, markRead, markAllRead };
}
