import { TrackableObject } from '../types';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches live aircraft data from OpenSky Network via the Supabase edge function proxy.
 * Maps the OpenSky state vector format to our TrackableObject interface.
 *
 * OpenSky returns state vectors as arrays:
 * [icao24, callsign, origin_country, time_position, last_contact,
 *  longitude, latitude, baro_altitude, on_ground, velocity,
 *  true_track, vertical_rate, sensors, geo_altitude, squawk,
 *  spi, position_source, category]
 */
export async function fetchOpenSkyAircraft(): Promise<TrackableObject[]> {
  try {
    const { data, error } = await supabase.functions.invoke('opensky-proxy');
    if (error) throw error;

    const states: any[] = data?.states || data?.aircraft || [];
    if (!Array.isArray(states) || states.length === 0) return [];

    return states
      .filter((s: any) => {
        // Must have valid position data and not be on the ground
        if (Array.isArray(s)) {
          return s[6] != null && s[5] != null && !s[8];
        }
        // Already mapped by edge function
        return s.latitude != null && s.longitude != null;
      })
      .slice(0, 150) // Cap at 150 for performance
      .map((s: any, i: number): TrackableObject => {
        // Handle raw OpenSky state vector arrays
        if (Array.isArray(s)) {
          return {
            id: `osky-${s[0] || i}`,
            name: (s[1] || s[0] || `Aircraft ${i}`).trim() || `UNKN-${i}`,
            type: 'aircraft',
            latitude: s[6],
            longitude: s[5],
            altitude: (s[13] ?? s[7] ?? 10000) / 1000, // meters → km
            speed: (s[9] ?? 0) * 3.6, // m/s → km/h
            heading: s[10] ?? 0,
            callsign: (s[1] || '').trim(),
            origin: s[2] || 'Unknown',
            status: (s[11] ?? 0) > 0 ? 'ascending' : (s[11] ?? 0) < 0 ? 'descending' : 'active',
          };
        }
        // Handle pre-mapped objects from the edge function
        return {
          id: s.id || `osky-${i}`,
          name: s.name || s.callsign || `Aircraft ${i}`,
          type: 'aircraft',
          latitude: s.latitude,
          longitude: s.longitude,
          altitude: s.altitude ?? 10,
          speed: s.speed ?? 800,
          heading: s.heading ?? 0,
          callsign: s.callsign,
          origin: s.origin,
          status: s.status || 'active',
        };
      });
  } catch (e) {
    console.error('[SKYWATCH] OpenSky fetch error:', e);
    return [];
  }
}
