import { TrackableObject } from '@/data/types';

// Simulated AIS vessel data for maritime domain awareness
// In production, this would connect to a real AIS feed (MarineTraffic, AISHub, etc.)

const VESSEL_TYPES = ['Cargo', 'Tanker', 'Container', 'Bulk Carrier', 'Fishing', 'Naval', 'Passenger', 'Tug'];
const FLAGS = ['PA', 'LR', 'MH', 'SG', 'HK', 'BS', 'MT', 'GR', 'NO', 'US', 'GB', 'CN', 'JP'];

interface VesselSeed {
    name: string;
    mmsi: string;
    lat: number;
    lon: number;
    heading: number;
    speed: number;
    vesselType: string;
    flag: string;
}

const VESSEL_SEEDS: VesselSeed[] = [
    { name: 'EVER GIVEN', mmsi: '353136000', lat: 30.5, lon: 32.3, heading: 340, speed: 22, vesselType: 'Container', flag: 'PA' },
    { name: 'MAERSK SEALAND', mmsi: '220417000', lat: 1.3, lon: 103.8, heading: 45, speed: 18, vesselType: 'Container', flag: 'SG' },
    { name: 'PACIFIC EXPLORER', mmsi: '538004805', lat: 35.4, lon: 139.7, heading: 180, speed: 15, vesselType: 'Passenger', flag: 'MH' },
    { name: 'ATLANTIC PIONEER', mmsi: '636018570', lat: 40.7, lon: -73.9, heading: 90, speed: 12, vesselType: 'Tanker', flag: 'LR' },
    { name: 'NORDIC SPIRIT', mmsi: '259000100', lat: 59.3, lon: 18.1, heading: 225, speed: 14, vesselType: 'Cargo', flag: 'NO' },
    { name: 'OCEAN TITAN', mmsi: '311000500', lat: 25.0, lon: -80.2, heading: 135, speed: 8, vesselType: 'Bulk Carrier', flag: 'BS' },
    { name: 'RED DRAGON', mmsi: '412000300', lat: 22.3, lon: 114.2, heading: 270, speed: 10, vesselType: 'Cargo', flag: 'CN' },
    { name: 'HMS DEFENDER', mmsi: '232005420', lat: 50.8, lon: -1.1, heading: 160, speed: 28, vesselType: 'Naval', flag: 'GB' },
    { name: 'USS CARL VINSON', mmsi: '338000100', lat: 32.7, lon: -117.2, heading: 270, speed: 30, vesselType: 'Naval', flag: 'US' },
    { name: 'FISHING EAGLE', mmsi: '440000200', lat: 36.3, lon: 140.4, heading: 45, speed: 6, vesselType: 'Fishing', flag: 'JP' },
    { name: 'STAR CLIPPER', mmsi: '249000800', lat: 35.9, lon: 14.5, heading: 310, speed: 9, vesselType: 'Passenger', flag: 'MT' },
    { name: 'BLUE MARLIN', mmsi: '245000600', lat: 51.9, lon: 4.5, heading: 200, speed: 11, vesselType: 'Cargo', flag: 'NL' },
    { name: 'GOLDEN HARVEST', mmsi: '636091800', lat: -33.9, lon: 18.4, heading: 90, speed: 13, vesselType: 'Bulk Carrier', flag: 'LR' },
    { name: 'JADE EMPRESS', mmsi: '477000900', lat: 1.3, lon: 104.0, heading: 180, speed: 16, vesselType: 'Container', flag: 'HK' },
    { name: 'ARCTIC WOLF', mmsi: '259001200', lat: 70.6, lon: 23.7, heading: 90, speed: 7, vesselType: 'Fishing', flag: 'NO' },
    { name: 'EMERALD COAST', mmsi: '240000400', lat: 37.9, lon: 23.7, heading: 150, speed: 14, vesselType: 'Tanker', flag: 'GR' },
    { name: 'HARBOUR TUG 7', mmsi: '338100700', lat: 37.8, lon: -122.4, heading: 340, speed: 5, vesselType: 'Tug', flag: 'US' },
    { name: 'CORAL PRINCESS', mmsi: '311200500', lat: 18.5, lon: -64.9, heading: 120, speed: 20, vesselType: 'Passenger', flag: 'BS' },
    { name: 'IRON MONARCH', mmsi: '503000100', lat: -37.8, lon: 144.9, heading: 280, speed: 12, vesselType: 'Bulk Carrier', flag: 'AU' },
    { name: 'SAIPH STAR', mmsi: '538005600', lat: 12.9, lon: 100.9, heading: 210, speed: 17, vesselType: 'Container', flag: 'MH' },
];

let vessels: TrackableObject[] = VESSEL_SEEDS.map((seed, i) => ({
    id: `vessel-${seed.mmsi}`,
    name: seed.name,
    type: 'vessel' as const,
    latitude: seed.lat,
    longitude: seed.lon,
    altitude: 0,
    speed: seed.speed,
    heading: seed.heading,
    callsign: seed.mmsi,
    country: seed.flag,
    operator: seed.vesselType,
    status: 'active' as const,
}));

export function getVessels(): TrackableObject[] {
    return vessels;
}

export function updateVessels(deltaTime: number): void {
    vessels = vessels.map((v) => {
        const headingRad = (v.heading * Math.PI) / 180;
        const distKm = (v.speed * deltaTime) / 3600;
        const dLat = (distKm * Math.cos(headingRad)) / 111;
        const dLon = (distKm * Math.sin(headingRad)) / (111 * Math.cos((v.latitude * Math.PI) / 180));

        let newLat = v.latitude + dLat;
        let newLon = v.longitude + dLon;

        // Wrap longitude
        if (newLon > 180) newLon -= 360;
        if (newLon < -180) newLon += 360;
        // Clamp latitude
        newLat = Math.max(-80, Math.min(80, newLat));

        // Small random heading drift to make it more realistic
        const headingDrift = (Math.random() - 0.5) * 2;

        return {
            ...v,
            latitude: newLat,
            longitude: newLon,
            heading: (v.heading + headingDrift + 360) % 360,
        };
    });
}
