import { describe, it, expect, vi } from 'vitest';

// Mock the Supabase client to prevent real network calls
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        functions: {
            invoke: vi.fn().mockRejectedValue(new Error('Network unavailable in test')),
        },
    },
}));

import { fetchOpenSkyAircraft } from '@/data/adapters/OpenSkyAdapter';
import { fetchSpaceXRockets } from '@/data/adapters/SpaceXAdapter';

describe('OpenSkyAdapter', () => {
    it('returns empty array on network failure', async () => {
        const result = await fetchOpenSkyAircraft();
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
    });
});

describe('SpaceXAdapter', () => {
    it('returns empty array on network failure', async () => {
        const result = await fetchSpaceXRockets();
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
    });
});
