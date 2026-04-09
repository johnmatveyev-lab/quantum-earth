import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTrackingService } from '@/data/services/TrackingService';

describe('TrackingService', () => {
    const service = getTrackingService();

    it('generates aircraft with valid coordinates', () => {
        const aircraft = service.getAircraft();
        expect(aircraft.length).toBeGreaterThan(0);
        aircraft.forEach((a) => {
            expect(a.type).toBe('aircraft');
            expect(a.latitude).toBeGreaterThanOrEqual(-90);
            expect(a.latitude).toBeLessThanOrEqual(90);
            expect(a.longitude).toBeGreaterThanOrEqual(-180);
            expect(a.longitude).toBeLessThanOrEqual(180);
            expect(a.altitude).toBeGreaterThanOrEqual(0);
            expect(a.speed).toBeGreaterThanOrEqual(0);
        });
    });

    it('generates satellites with orbital parameters', () => {
        const satellites = service.getSatellites();
        expect(satellites.length).toBeGreaterThan(0);
        satellites.forEach((s) => {
            expect(s.type).toBe('satellite');
            expect(s.altitude).toBeGreaterThan(0);
            expect(s.status).toBe('orbiting');
        });
    });

    it('generates rockets', () => {
        const rockets = service.getRockets();
        expect(rockets.length).toBeGreaterThan(0);
        rockets.forEach((r) => {
            expect(r.type).toBe('rocket');
            expect(['active', 'ascending']).toContain(r.status);
        });
    });

    it('updates positions over time without errors', () => {
        const before = service.getAircraft().map((a) => ({ lat: a.latitude, lon: a.longitude }));
        service.update(10000); // 10 seconds — enough to see movement
        const after = service.getAircraft();

        // Should still have the same number of objects
        expect(after.length).toBe(before.length);

        // At least some positions should have changed
        const moved = after.some((a, i) =>
            a.latitude.toFixed(4) !== before[i].lat.toFixed(4) ||
            a.longitude.toFixed(4) !== before[i].lon.toFixed(4)
        );
        expect(moved).toBe(true);
    });

    it('aircraft have valid headings', () => {
        const aircraft = service.getAircraft();
        aircraft.forEach((a) => {
            expect(a.heading).toBeGreaterThanOrEqual(0);
            expect(a.heading).toBeLessThan(360);
        });
    });
});
