import { supabase } from '@/integrations/supabase/client';
import { useTrackingStore } from '@/store/useTrackingStore';

export async function fetchAIAnalysis(analysisType: 'trajectory' | 'collision' | 'anomaly' | 'general') {
  const store = useTrackingStore.getState();
  store.setAIAnalysis({ loading: true });

  try {
    // Prepare compact tracking data summary
    const trackingData = {
      aircraftCount: store.aircraft.length,
      satelliteCount: store.satellites.length,
      rocketCount: store.rockets.length,
      sampleAircraft: store.aircraft.slice(0, 10).map(a => ({
        id: a.id, name: a.name, lat: +a.latitude.toFixed(2), lon: +a.longitude.toFixed(2),
        alt: +a.altitude.toFixed(1), speed: +a.speed.toFixed(0), heading: +a.heading.toFixed(0),
      })),
      sampleSatellites: store.satellites.slice(0, 10).map(s => ({
        id: s.id, name: s.name, lat: +s.latitude.toFixed(2), lon: +s.longitude.toFixed(2),
        alt: +s.altitude.toFixed(0), speed: +s.speed.toFixed(0),
      })),
      rockets: store.rockets.map(r => ({
        id: r.id, name: r.name, lat: +r.latitude.toFixed(2), lon: +r.longitude.toFixed(2),
        alt: +r.altitude.toFixed(0), speed: +r.speed.toFixed(0), status: r.status,
      })),
      selectedObject: store.selectedObject ? {
        id: store.selectedObject.id, name: store.selectedObject.name,
        type: store.selectedObject.type,
        lat: store.selectedObject.latitude, lon: store.selectedObject.longitude,
        alt: store.selectedObject.altitude, speed: store.selectedObject.speed,
      } : null,
    };

    const { data, error } = await supabase.functions.invoke('ai-analyze', {
      body: { trackingData, analysisType },
    });

    if (error) throw error;

    let parsed = data.analysis;
    // Try to extract JSON if the AI returned it
    try {
      const jsonMatch = parsed.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[1]);
        store.setAIAnalysis({
          ...jsonData,
          summary: jsonData.summary || parsed,
          loading: false,
          lastUpdated: Date.now(),
        });
        return;
      }
    } catch { }

    store.setAIAnalysis({
      summary: parsed,
      loading: false,
      lastUpdated: Date.now(),
    });
  } catch (e: any) {
    console.error('AI analysis error:', e);
    store.setAIAnalysis({
      summary: `Analysis unavailable: ${e.message || 'Unknown error'}`,
      loading: false,
    });
  }
}

export async function fetchLiveAircraft() {
  try {
    const { data, error } = await supabase.functions.invoke('opensky-proxy');
    if (error) throw error;
    return data.aircraft || [];
  } catch (e) {
    console.error('OpenSky fetch error:', e);
    return [];
  }
}

export async function fetchSatellites(group: string = 'active') {
  try {
    const { data, error } = await supabase.functions.invoke('celestrak-proxy', {
      body: { group },
    });
    // The edge function accepts query params but since supabase.functions.invoke
    // mostly uses POST with body, we can just pass body here, though I'll adjust the
    // edge function to check body as well, or just append querystring for GET.
    // Actually invoke allows we pass query params like this in the URL:
    // await supabase.functions.invoke(`celestrak-proxy?group=${group}`);

    // So let's use the query string approach
    const res = await supabase.functions.invoke(`celestrak-proxy?group=${group}`, {
      method: 'GET'
    });
    if (res.error) throw res.error;
    return res.data.satellites || [];
  } catch (e) {
    console.error('CelesTrak fetch error:', e);
    return [];
  }
}

export async function fetchSpaceXLaunches() {
  try {
    const { data, error } = await supabase.functions.invoke('spacex-proxy', {
      body: {},
    });
    if (error) throw error;
    return data.data || [];
  } catch (e) {
    console.error('SpaceX fetch error:', e);
    return [];
  }
}

export async function fetchSnapshots(limit: number = 24) {
  try {
    const { data, error } = await (supabase as any)
      .from('tracking_snapshots')
      .select('id, snapshot_time, source, object_count, description')
      .order('snapshot_time', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Snapshot list fetch error:', e);
    return [];
  }
}

export async function fetchSnapshotPositions(snapshotId: string) {
  try {
    // We only fetch a chunk or handle pagination if there are too many,
    // but for now fetch all positions for a snapshot.
    const { data, error } = await (supabase as any)
      .from('object_positions')
      .select('*')
      .eq('snapshot_id', snapshotId);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error(`Snapshot positions fetch error for ${snapshotId}:`, e);
    return [];
  }
}
