import { TrackableObject, TrackingDataProvider } from '../types';
import { fetchLiveAircraft } from './APIService';
import { SatelliteAdapter } from '../adapters/SatelliteAdapter';

const AIRLINES = [
  'UAL', 'DAL', 'AAL', 'SWA', 'BAW', 'DLH', 'AFR', 'KLM', 'JAL', 'ANA',
  'QFA', 'SIA', 'CPA', 'UAE', 'THY', 'ETH', 'LAN', 'ACA', 'SAS', 'FIN',
  'RYR', 'EZY', 'AZU', 'CSN', 'CCA', 'CES', 'KAL', 'EVA', 'TAP', 'IBE',
];

const AIRPORTS: [string, number, number][] = [
  ['JFK', 40.6, -73.8], ['LAX', 33.9, -118.4], ['LHR', 51.5, -0.5],
  ['CDG', 49.0, 2.5], ['NRT', 35.8, 140.4], ['SYD', -33.9, 151.2],
  ['DXB', 25.3, 55.4], ['SIN', 1.4, 104.0], ['FRA', 50.0, 8.6],
  ['HKG', 22.3, 114.2], ['ICN', 37.5, 126.5], ['GRU', -23.4, -46.5],
  ['YYZ', 43.7, -79.6], ['AMS', 52.3, 4.8], ['IST', 41.3, 28.7],
  ['PEK', 40.1, 116.6], ['DEL', 28.6, 77.1], ['BKK', 13.7, 100.7],
  ['JNB', -26.1, 28.2], ['MEX', 19.4, -99.1],
];

function rand(a: number, b: number) { return a + Math.random() * (b - a); }

function normalizeLongitude(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function normalizeLatLon(lat: number, lon: number): { lat: number; lon: number } {
  let nLat = lat;
  let nLon = lon;

  while (nLat > 90) {
    nLat = 180 - nLat;
    nLon += 180;
  }
  while (nLat < -90) {
    nLat = -180 - nLat;
    nLon += 180;
  }

  return {
    lat: Math.max(-89.9999, Math.min(89.9999, nLat)),
    lon: normalizeLongitude(nLon),
  };
}

// Generate realistic flight paths between airports
function generateAircraft(count: number): TrackableObject[] {
  return Array.from({ length: count }, (_, i) => {
    const airline = AIRLINES[i % AIRLINES.length];
    const origin = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
    const dest = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
    const t = Math.random();
    const lat = origin[1] + (dest[1] - origin[1]) * t + rand(-5, 5);
    const lon = origin[2] + (dest[2] - origin[2]) * t + rand(-5, 5);
    const heading = Math.atan2(dest[2] - origin[2], dest[1] - origin[1]) * (180 / Math.PI) + rand(-10, 10);

    return {
      id: `ac-${i}`,
      name: `${airline}${1000 + Math.floor(Math.random() * 9000)}`,
      type: 'aircraft' as const,
      latitude: Math.max(-80, Math.min(80, lat)),
      longitude: ((lon + 540) % 360) - 180,
      altitude: rand(9, 13),
      speed: rand(780, 920),
      heading: ((heading % 360) + 360) % 360,
      callsign: `${airline}${100 + Math.floor(Math.random() * 900)}`,
      origin: origin[0],
      destination: dest[0],
      status: 'active' as const,
    };
  });
}

function generateRockets(count: number): TrackableObject[] {
  const launchSites: [string, number, number][] = [
    ['Cape Canaveral', 28.5, -80.6],
    ['Baikonur', 45.6, 63.3],
    ['Kourou', 5.2, -52.8],
    ['Vandenberg', 34.7, -120.6],
    ['Tanegashima', 30.4, 131.0],
  ];

  return Array.from({ length: count }, (_, i) => {
    const site = launchSites[i % launchSites.length];
    return {
      id: `rk-${i}`,
      name: `Launch-${String(i + 1).padStart(2, '0')}`,
      type: 'rocket' as const,
      latitude: site[1] + rand(-2, 8),
      longitude: site[2] + rand(-5, 15),
      altitude: rand(50, 350),
      speed: rand(8000, 22000),
      heading: rand(30, 120),
      status: 'ascending' as const,
    };
  });
}

import { fetchSnapshots, fetchSnapshotPositions } from './APIService';
import { useTrackingStore } from '../../store/useTrackingStore';

export class MockTrackingService implements TrackingDataProvider {
  private aircraft: TrackableObject[] = [];
  private rockets: TrackableObject[] = [];
  private satelliteAdapter: SatelliteAdapter;
  private time = 0;

  // Live state polling
  private isFetchingAircraft = false;
  private lastAircraftFetch = 0;

  // Historical state polling
  private isFetchingHistory = false;
  private lastHistoryPos = 1;
  private currentSnapshotId: string | null = null;
  private snapshotsCache: any[] | null = null;

  constructor() {
    this.rockets = generateRockets(5);
    this.satelliteAdapter = new SatelliteAdapter();
    this.aircraft = generateAircraft(50);
  }

  getAircraft() { return this.aircraft; }
  getSatellites() { return this.satelliteAdapter.getSatellites(); }
  getRockets() { return this.rockets; }

  async update(deltaTime: number) {
    const dt = deltaTime / 1000;
    this.time += dt;
    const earthR = 6371;
    const now = Date.now();

    // Check timeline state from store
    const store = useTrackingStore.getState();
    const pos = store.timelinePosition;

    // Handle Historical View
    if (pos < 0.99) {
      // Allow timeline play forward using simulation dt
      if (store.timelinePlaying) {
        // scale 1 sec real time = N minutes sim time based on speed
        const newPos = Math.min(1, pos + (dt * store.simulationSpeed * 0.0001));
        store.setTimelinePosition(newPos);
      }

      // Re-fetch snapshots catalog if empty
      if (!this.snapshotsCache && !this.isFetchingHistory) {
        this.isFetchingHistory = true;
        this.snapshotsCache = await fetchSnapshots(100);
        this.isFetchingHistory = false;
      }

      // Calculate which snapshot corresponds to the requested position
      if (this.snapshotsCache && this.snapshotsCache.length > 0) {
        // pos=1 means now, pos=0 means 24h ago
        const hoursAgo = (1 - pos) * 24;
        const targetTime = new Date(Date.now() - hoursAgo * 3600 * 1000).getTime();

        let closestSnap = this.snapshotsCache[0];
        let minDiff = Infinity;
        for (const s of this.snapshotsCache) {
          const diff = Math.abs(new Date(s.snapshot_time).getTime() - targetTime);
          if (diff < minDiff) { minDiff = diff; closestSnap = s; }
        }

        if (closestSnap.id !== this.currentSnapshotId && !this.isFetchingHistory) {
          this.currentSnapshotId = closestSnap.id;
          this.isFetchingHistory = true;
          fetchSnapshotPositions(closestSnap.id).then(positions => {
            const newAc: TrackableObject[] = [];
            const newSat: TrackableObject[] = [];

            for (const p of positions) {
              if (p.object_type === 'aircraft') {
                newAc.push({
                  id: p.object_id,
                  name: p.name || 'Unknown',
                  callsign: p.callsign,
                  type: 'aircraft',
                  latitude: p.latitude,
                  longitude: p.longitude,
                  altitude: p.altitude,
                  speed: p.speed,
                  heading: p.heading,
                  status: p.status,
                  origin: p.metadata?.origin
                });
              }
              if (p.object_type === 'satellite') {
                newSat.push({
                  id: p.object_id,
                  name: p.name || 'Unknown',
                  type: 'satellite',
                  latitude: p.latitude,
                  longitude: p.longitude,
                  altitude: p.altitude,
                  speed: p.speed,
                  heading: p.heading,
                  status: p.status
                });
              }
            }
            this.aircraft = newAc;
            // Note: satellite adapter handles TLEs normally, but for raw history replay
            // we bypass TLE prop and just render fixed dots for satellites in history.
            (this.satelliteAdapter as any).setStaticSatellites(newSat);
            this.isFetchingHistory = false;
          });
        }
      }
      return;
    }

    // Handle Live View
    if (this.lastHistoryPos !== pos && pos >= 0.99) {
      // Transitioning from history back to live
      (this.satelliteAdapter as any).clearStaticSatellites();
      this.currentSnapshotId = null;
      this.lastAircraftFetch = 0; // force immediate fetch
    }
    this.lastHistoryPos = pos;
    // Clear out cache if live
    this.snapshotsCache = null;

    if (now - this.lastAircraftFetch > 30000 && !this.isFetchingAircraft) {
      this.fetchRealAircraft();
    }

    this.satelliteAdapter.update(deltaTime);

    this.aircraft.forEach(obj => {
      const speedDeg = (obj.speed / (2 * Math.PI * earthR)) * 360 * dt;
      const rad = (obj.heading * Math.PI) / 180;
      obj.latitude += Math.cos(rad) * speedDeg;
      obj.longitude += (Math.sin(rad) * speedDeg) / Math.max(Math.cos((obj.latitude * Math.PI) / 180), 0.01);
      if (obj.longitude > 180) obj.longitude -= 360;
      if (obj.longitude < -180) obj.longitude += 360;
      obj.latitude = Math.max(-75, Math.min(75, obj.latitude));

      if (obj.id.startsWith('ac-')) {
        obj.heading += (Math.random() - 0.5) * 1.5 * dt;
        obj.heading = ((obj.heading % 360) + 360) % 360;
      }
    });

    this.rockets.forEach(r => {
      const speedDeg = (r.speed / (2 * Math.PI * earthR)) * 360 * dt;
      const rad = (r.heading * Math.PI) / 180;
      r.latitude += Math.cos(rad) * speedDeg * 0.5;
      r.longitude += (Math.sin(rad) * speedDeg * 0.5) / Math.max(Math.cos((r.latitude * Math.PI) / 180), 0.01);
      if (r.longitude > 180) r.longitude -= 360;
      if (r.longitude < -180) r.longitude += 360;
      r.latitude = Math.max(-80, Math.min(80, r.latitude));
      r.altitude += rand(-0.3, 1.8) * dt;
      r.altitude = Math.max(50, Math.min(600, r.altitude));
    });
  }

  private async fetchRealAircraft() {
    this.isFetchingAircraft = true;
    try {
      const live = await fetchLiveAircraft();
      if (live && live.length > 0) {
        this.aircraft = live.map((a: any) => ({
          id: a.icao24,
          name: a.callsign?.trim() || 'Unknown',
          type: 'aircraft',
          latitude: a.latitude,
          longitude: a.longitude,
          altitude: a.baro_altitude ? a.baro_altitude / 1000 : 10,
          speed: a.velocity ? a.velocity * 3.6 : 800,
          heading: a.true_track || 0,
          callsign: a.callsign?.trim(),
          origin: a.origin_country,
          status: a.on_ground ? 'grounded' : 'active'
        }));
      }
      this.lastAircraftFetch = Date.now();
    } catch (e) {
      console.error('Failed to update live aircraft', e);
    } finally {
      this.isFetchingAircraft = false;
    }
  }
}

let instance: MockTrackingService | null = null;
export function getTrackingService(): MockTrackingService {
  if (!instance) instance = new MockTrackingService();
  return instance;
}
