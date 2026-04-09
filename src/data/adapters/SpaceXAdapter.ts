import { TrackableObject } from '../types';
import { supabase } from '@/integrations/supabase/client';

interface SpaceXLaunch {
  id: string;
  name: string;
  date_utc: string;
  success: boolean | null;
  upcoming: boolean;
  details: string | null;
  launchpad: string;
  rocket: string;
}

// Known SpaceX launch sites with coordinates
const LAUNCH_SITES: Record<string, { lat: number; lon: number; name: string }> = {
  '5e9e4501f509094ba4566f84': { lat: 28.5620, lon: -80.5772, name: 'Cape Canaveral SLC-40' },
  '5e9e4502f509092b78566f87': { lat: 28.6080, lon: -80.6040, name: 'Kennedy LC-39A' },
  '5e9e4502f5090995de566f86': { lat: 34.6321, lon: -120.6108, name: 'Vandenberg SLC-4E' },
  '5e9e4502f509094188566f88': { lat: 25.9968, lon: -97.1549, name: 'Starbase Boca Chica' },
};

const DEFAULT_SITE = { lat: 28.5620, lon: -80.5772, name: 'Cape Canaveral' };

/**
 * Fetches SpaceX launch data via the Supabase edge function proxy.
 * Maps launches to TrackableObject rockets.
 */
export async function fetchSpaceXRockets(): Promise<TrackableObject[]> {
  try {
    const { data, error } = await supabase.functions.invoke('spacex-proxy', { body: {} });
    if (error) throw error;

    const launches: SpaceXLaunch[] = data?.data || data?.launches || [];
    if (!Array.isArray(launches) || launches.length === 0) return [];

    return launches
      .slice(0, 20)
      .map((launch, i): TrackableObject => {
        const site = LAUNCH_SITES[launch.launchpad] || DEFAULT_SITE;

        // Simulate position based on launch status
        const isUpcoming = launch.upcoming;
        const altitudeKm = isUpcoming ? 0 : 200 + Math.random() * 300;
        const speedKmh = isUpcoming ? 0 : 20000 + Math.random() * 8000;

        return {
          id: `sx-${launch.id || i}`,
          name: launch.name || `SpaceX Launch ${i + 1}`,
          type: 'rocket',
          latitude: site.lat + (isUpcoming ? 0 : (Math.random() - 0.5) * 10),
          longitude: site.lon + (isUpcoming ? 0 : (Math.random() - 0.5) * 20),
          altitude: altitudeKm,
          speed: speedKmh,
          heading: isUpcoming ? 0 : 80 + Math.random() * 20,
          origin: site.name,
          status: isUpcoming ? 'active' : 'ascending',
        };
      });
  } catch (e) {
    console.error('[SKYWATCH] SpaceX fetch error:', e);
    return [];
  }
}
