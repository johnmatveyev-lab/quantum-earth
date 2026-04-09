import { useEffect, useRef } from 'react';
import { getTrackingService } from '@/data/services/TrackingService';
import { fetchOpenSkyAircraft } from '@/data/adapters/OpenSkyAdapter';
import { fetchSpaceXRockets } from '@/data/adapters/SpaceXAdapter';
import { getVessels, updateVessels } from '@/data/adapters/AISAdapter';
import { useTrackingStore } from '@/store/useTrackingStore';

export function useTracking() {
  const service = useRef(getTrackingService());
  const { setAircraft, setSatellites, setRockets, setVessels, simulationSpeed, dataSource } = useTrackingStore();
  const speedRef = useRef(simulationSpeed);
  const dataSourceRef = useRef(dataSource);
  speedRef.current = simulationSpeed;
  dataSourceRef.current = dataSource;

  // Simulation loop — always runs for satellites (no live satellite API yet)
  useEffect(() => {
    // Initial simulation data
    setAircraft([...service.current.getAircraft()]);
    setSatellites([...service.current.getSatellites()]);
    setRockets([...service.current.getRockets()]);
    setVessels([...getVessels()]);

    let lastTick = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const elapsedMs = now - lastTick;
      lastTick = now;

      service.current.update(elapsedMs * speedRef.current);

      // Always update satellites from simulation (no live API yet)
      setSatellites([...service.current.getSatellites()]);

      // Update vessel positions
      updateVessels(elapsedMs * speedRef.current / 1000);
      setVessels([...getVessels()]);

      // Only update aircraft/rockets from simulation when not in live mode
      if (dataSourceRef.current === 'simulation') {
        setAircraft([...service.current.getAircraft()]);
        setRockets([...service.current.getRockets()]);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [setAircraft, setSatellites, setRockets, setVessels]);

  // Live data polling — OpenSky for aircraft, SpaceX for rockets
  useEffect(() => {
    if (dataSource !== 'live') return;

    let active = true;

    const pollAircraft = async () => {
      if (!active) return;
      try {
        const liveAircraft = await fetchOpenSkyAircraft();
        if (active && liveAircraft.length > 0) {
          setAircraft(liveAircraft);
        }
      } catch (e) {
        console.error('[SKYWATCH] Live aircraft poll failed:', e);
      }
    };

    const pollRockets = async () => {
      if (!active) return;
      try {
        const liveRockets = await fetchSpaceXRockets();
        if (active && liveRockets.length > 0) {
          setRockets(liveRockets);
        }
      } catch (e) {
        console.error('[SKYWATCH] Live rockets poll failed:', e);
      }
    };

    // Initial fetch
    pollAircraft();
    pollRockets();

    // OpenSky updates every ~10-15s
    const aircraftId = setInterval(pollAircraft, 15000);
    // SpaceX data is relatively static — poll every 5 minutes
    const rocketId = setInterval(pollRockets, 300000);

    return () => {
      active = false;
      clearInterval(aircraftId);
      clearInterval(rocketId);
    };
  }, [dataSource, setAircraft, setRockets]);
}
