import { TrackingDataProvider, TrackableObject } from '../types';
import { fetchSatellites } from '../services/APIService';
import * as satellite from 'satellite.js';

const SAT_PREFIXES = [
  'Starlink-', 'ISS-', 'GPS-IIF-', 'GOES-', 'Landsat-', 'Sentinel-',
  'NOAA-', 'Iridium-', 'OneWeb-', 'Cosmos-', 'Molniya-', 'Galileo-',
  'GLONASS-', 'BeiDou-', 'Inmarsat-', 'SES-',
];
function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function normalizeLatLon(lat: number, lon: number): { lat: number; lon: number } {
  let nLat = lat;
  let nLon = lon;
  while (nLat > 90) { nLat = 180 - nLat; nLon += 180; }
  while (nLat < -90) { nLat = -180 - nLat; nLon += 180; }
  return {
    lat: Math.max(-89.9999, Math.min(89.9999, nLat)),
    lon: ((((nLon + 180) % 360) + 360) % 360) - 180,
  };
}

export class SatelliteAdapter implements TrackingDataProvider {
  private satellites: TrackableObject[] = [];
  private satRecords: Map<string, satellite.SatRec> = new Map();
  private lastFetch = 0;
  private isFetching = false;

  // Fallback orbit params
  private fakeOrbitalParams = new Map<string, {
    inclinationRad: number; phase0: number; raanRad: number; angularSpeedRad: number;
    orbitRadiusKm: number; periodSeconds: number;
  }>();
  private time = 0;
  private isUsingFakeSats = false;

  constructor() {
    this.generateFakeSatellites(80); // Call with count as in original
  }

  getAircraft(): TrackableObject[] { return []; }
  getRockets(): TrackableObject[] { return []; }

  public getSatellites(): TrackableObject[] {
    if (this.staticSatellites) return this.staticSatellites;
    return this.activeSatellites;
  }

  public setStaticSatellites(s: TrackableObject[]) {
    this.staticSatellites = s;
  }

  public clearStaticSatellites() {
    this.staticSatellites = null;
  }

  public update(deltaTime: number): void {
    if (this.staticSatellites) return; // Skip logic if replaying history

    const dt = deltaTime / 1000;
    this.time += dt;
    const now = Date.now();

    // Fetch live satellites every 15 minutes roughly
    if (now - this.lastFetch > 15 * 60 * 1000 && !this.isFetching) {
      this.fetchLiveTles();
    }

    if (this.isUsingFakeSats) {
      this.updateFakeSatellites(dt);
      return;
    }

    // Propagate orbits using TLEs
    const currentDate = new Date();
    this.activeSatellites.forEach(sat => {
      const rec = this.tleRecords[sat.id];
      if (rec && rec.satrec) {
        try {
          const positionAndVelocity = satellite.propagate(rec.satrec, currentDate);
          const positionEci = positionAndVelocity.position;
          const velocityEci = positionAndVelocity.velocity;

          if (typeof positionEci !== 'boolean' && typeof velocityEci !== 'boolean') {
            const gmst = satellite.gstime(currentDate);
            const positionGd = satellite.eciToGeodetic(positionEci, gmst);

            const longitude = satellite.degreesLong(positionGd.longitude);
            const latitude = satellite.degreesLat(positionGd.latitude);
            const altitude = positionGd.height;

            // Calculate speed in km/h based on velocity vector magnitude using the 3D velocity
            const speedKmS = Math.sqrt(
              Math.pow(velocityEci.x, 2) + Math.pow(velocityEci.y, 2) + Math.pow(velocityEci.z, 2)
            );

            sat.latitude = latitude;
            sat.longitude = longitude;
            sat.altitude = altitude;
            sat.speed = speedKmS * 3600; // km/h
          }
        } catch (e) {
          console.debug(`Orbit propagation failed for ${sat.name}`, e);
        }
      } else {
        // Fake wandering for placeholders (from new instruction)
        sat.longitude += deltaTime * 0.005;
        if (sat.longitude > 180) sat.longitude -= 360;
      }
    });
  }

  private async fetchLiveTles() {
    this.isFetching = true;
    try {
      const activeData = await fetchSatellites('active');
      if (!activeData || activeData.length === 0) {
        throw new Error("No satellites fetched, using fallback");
      }

      const newSats: TrackableObject[] = [];
      this.tleRecords = {}; // Clear existing records

      activeData.forEach((s: any) => {
        if (s.name && s.tle1 && s.tle2) { // Use tle1, tle2 as in original fetchData
          try {
            const satrec = satellite.twoline2satrec(s.tle1, s.tle2);
            const id = s.id; // Use original id from raw data

            newSats.push({
              id,
              name: s.name,
              type: 'satellite',
              latitude: 0,
              longitude: 0,
              altitude: 0,
              speed: 0,
              heading: 0,
              status: 'orbiting'
            });

            this.tleRecords[id] = { satrec };
          } catch (e) {
            // Ignore parse errors for individual sats
          }
        }
      });

      this.activeSatellites = newSats;
      this.isUsingFakeSats = false;
    } catch (e) {
      console.warn('Failed to fetch satellite TLEs, keeping fake satellites alive.', e);
      if (this.activeSatellites.length === 0 || !this.isUsingFakeSats) {
        this.generateFakeSatellites(80); // Regenerate if no active sats or not using fake
      }
    } finally {
      this.lastFetch = Date.now();
      this.isFetching = false;
    }
  }

  private generateFakeSatellites(count: number) {
    this.isUsingFakeSats = true;
    const earthR = 6371;
    this.activeSatellites = Array.from({ length: count }, (_, i) => {
      const prefix = SAT_PREFIXES[i % SAT_PREFIXES.length];
      const tierRoll = Math.random();
      const altitude = tierRoll < 0.78 ? rand(420, 1200) : rand(4000, 12000);
      const inclinationDeg = tierRoll < 0.78 ? rand(45, 98) : rand(52, 64);
      const orbitRadiusKm = earthR + altitude;
      const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(orbitRadiusKm, 3) / 398600);
      const angularSpeedRad = (2 * Math.PI) / periodSeconds;
      const phase0 = Math.random() * Math.PI * 2;
      const raanRad = Math.random() * Math.PI * 2;
      const inclinationRad = (inclinationDeg * Math.PI) / 180;
      const id = `fake-sat-${i}`;

      this.fakeOrbitalParams.set(id, { inclinationRad, phase0, raanRad, angularSpeedRad, orbitRadiusKm, periodSeconds });

      const initialLat = Math.asin(Math.sin(inclinationRad) * Math.sin(phase0)) * (180 / Math.PI);
      const initialLon = (raanRad + Math.atan2(Math.cos(inclinationRad) * Math.sin(phase0), Math.cos(phase0))) * (180 / Math.PI);
      const initialCoords = normalizeLatLon(initialLat, initialLon);
      const speed = ((2 * Math.PI * orbitRadiusKm) / periodSeconds) * 3600;

      return {
        id,
        name: `${prefix}${1000 + Math.floor(Math.random() * 9000)}`,
        type: 'satellite' as const,
        latitude: initialCoords.lat,
        longitude: initialCoords.lon,
        altitude,
        speed,
        heading: rand(0, 360),
        status: 'orbiting' as const,
      };
    });
  }

  private updateFakeSatellites(dt: number) {
    const EARTH_ROTATION_RATE_RAD_S = (2 * Math.PI) / 86164;
    this.satellites.forEach(obj => {
      const params = this.fakeOrbitalParams.get(obj.id);
      if (!params) return;

      const argLatitude = params.phase0 + params.angularSpeedRad * this.time;
      const computedLat = Math.asin(Math.sin(params.inclinationRad) * Math.sin(argLatitude)) * (180 / Math.PI);
      const lonInOrbit = Math.atan2(
        Math.cos(params.inclinationRad) * Math.sin(argLatitude),
        Math.cos(argLatitude)
      );
      const computedLon = (params.raanRad + lonInOrbit - EARTH_ROTATION_RATE_RAD_S * this.time) * (180 / Math.PI);
      const normalized = normalizeLatLon(computedLat, computedLon);

      obj.latitude = normalized.lat;
      obj.longitude = normalized.lon;

      const nextArgLatitude = argLatitude + params.angularSpeedRad * 2;
      const nextLat = Math.asin(Math.sin(params.inclinationRad) * Math.sin(nextArgLatitude)) * (180 / Math.PI);
      const nextLon = (params.raanRad + Math.atan2(
        Math.cos(params.inclinationRad) * Math.sin(nextArgLatitude),
        Math.cos(nextArgLatitude)
      ) - EARTH_ROTATION_RATE_RAD_S * (this.time + 2)) * (180 / Math.PI);

      const dLon = ((nextLon - normalized.lon + 540) % 360) - 180;
      obj.heading = (Math.atan2(dLon, nextLat - normalized.lat) * (180 / Math.PI) + 360) % 360;
    });
  }
}
