import { describe, it, expect, vi } from 'vitest';

// Mock Supabase before importing the store
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        },
    },
}));

import { useTrackingStore } from '@/store/useTrackingStore';

describe('useTrackingStore', () => {
    it('initializes with default state', () => {
        const state = useTrackingStore.getState();
        expect(state.aircraft).toEqual([]);
        expect(state.satellites).toEqual([]);
        expect(state.rockets).toEqual([]);
        expect(state.selectedObject).toBeNull();
        expect(state.hoveredObject).toBeNull();
        expect(state.dataSource).toBe('simulation');
        expect(state.showAircraft).toBe(true);
        expect(state.showSatellites).toBe(true);
        expect(state.showRockets).toBe(true);
    });

    it('sets and retrieves aircraft', () => {
        const mockAircraft = [{
            id: 'test-1', name: 'Test Aircraft', type: 'aircraft' as const,
            latitude: 40.7, longitude: -74.0, altitude: 10, speed: 800,
            heading: 90, status: 'active' as const,
        }];
        useTrackingStore.getState().setAircraft(mockAircraft);
        expect(useTrackingStore.getState().aircraft).toEqual(mockAircraft);
    });

    it('toggles category filters', () => {
        const { toggleAircraft, toggleSatellites, toggleRockets } = useTrackingStore.getState();

        toggleAircraft();
        expect(useTrackingStore.getState().showAircraft).toBe(false);
        toggleAircraft();
        expect(useTrackingStore.getState().showAircraft).toBe(true);

        toggleSatellites();
        expect(useTrackingStore.getState().showSatellites).toBe(false);

        toggleRockets();
        expect(useTrackingStore.getState().showRockets).toBe(false);
    });

    it('selects exclusive category', () => {
        useTrackingStore.getState().selectExclusiveCategory('aircraft');
        const state = useTrackingStore.getState();
        expect(state.showAircraft).toBe(true);
        expect(state.showSatellites).toBe(false);
        expect(state.showRockets).toBe(false);
    });

    it('manages compared objects with max 3 limit', () => {
        const obj1 = { id: '1', name: 'A', type: 'aircraft' as const, latitude: 0, longitude: 0, altitude: 0, speed: 0, heading: 0, status: 'active' as const };
        const obj2 = { ...obj1, id: '2', name: 'B' };
        const obj3 = { ...obj1, id: '3', name: 'C' };
        const obj4 = { ...obj1, id: '4', name: 'D' };

        const store = useTrackingStore.getState();
        store.clearComparedObjects();
        store.addComparedObject(obj1);
        store.addComparedObject(obj2);
        store.addComparedObject(obj3);
        store.addComparedObject(obj4); // should be ignored (max 3)

        expect(useTrackingStore.getState().comparedObjects).toHaveLength(3);

        store.removeComparedObject('2');
        expect(useTrackingStore.getState().comparedObjects).toHaveLength(2);
    });

    it('toggles globe layers', () => {
        const store = useTrackingStore.getState();
        const hasNightLights = store.activeLayers.has('nightLights');
        store.toggleLayer('nightLights');
        expect(useTrackingStore.getState().activeLayers.has('nightLights')).toBe(!hasNightLights);
    });

    it('updates AI analysis state', () => {
        useTrackingStore.getState().setAIAnalysis({ summary: 'Test analysis', loading: false, lastUpdated: Date.now() });
        const { aiAnalysis } = useTrackingStore.getState();
        expect(aiAnalysis.summary).toBe('Test analysis');
        expect(aiAnalysis.loading).toBe(false);
    });
});
