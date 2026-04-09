export interface CameraFeed {
  id: string;
  name: string;
  lat: number;
  lon: number;
  feedUrl: string;
  feedType: 'iframe' | 'youtube' | 'hls';
  source: string;
  thumbnailEmoji: string;
  description: string;
  global?: boolean;
}

export const CAMERA_FEEDS: CameraFeed[] = [
  // Global feeds (always shown)
  { id: 'iss-live', name: 'ISS Live Stream', lat: 0, lon: 0, feedUrl: 'https://www.youtube.com/embed/P9C25Un7xaM', feedType: 'youtube', source: 'NASA', thumbnailEmoji: '🛸', description: 'Live HD view from the International Space Station', global: true },
  { id: 'iss-tracker', name: 'ISS Tracker View', lat: 0, lon: 0, feedUrl: 'https://www.youtube.com/embed/xRPTBhmcyXY', feedType: 'youtube', source: 'NASA', thumbnailEmoji: '🌍', description: 'Real-time ISS position and Earth view', global: true },

  // North America
  { id: 'nyc-times-sq', name: 'Times Square', lat: 40.758, lon: -73.9855, feedUrl: 'https://www.youtube.com/embed/eJ7ZkQ5TC08', feedType: 'youtube', source: 'EarthCam', thumbnailEmoji: '🗽', description: 'Live view of Times Square, New York City' },
  { id: 'lax-airport', name: 'LAX Airport', lat: 33.9425, lon: -118.408, feedUrl: 'https://www.youtube.com/embed/aGBYMU0de44', feedType: 'youtube', source: 'Airport Webcam', thumbnailEmoji: '✈️', description: 'Los Angeles International Airport runway cam' },
  { id: 'yellowstone', name: 'Yellowstone Old Faithful', lat: 44.4605, lon: -110.828, feedUrl: 'https://www.youtube.com/embed/N1RBHfxIbVo', feedType: 'youtube', source: 'NPS', thumbnailEmoji: '🌋', description: 'Old Faithful geyser live cam' },
  { id: 'miami-beach', name: 'Miami Beach', lat: 25.7617, lon: -80.1918, feedUrl: 'https://www.youtube.com/embed/JrVZgNnWODo', feedType: 'youtube', source: 'EarthCam', thumbnailEmoji: '🏖️', description: 'South Beach live panoramic view' },
  { id: 'sf-goldengate', name: 'Golden Gate Bridge', lat: 37.8199, lon: -122.4783, feedUrl: 'https://www.youtube.com/embed/BqLiCeQamJk', feedType: 'youtube', source: 'EarthCam', thumbnailEmoji: '🌉', description: 'Golden Gate Bridge live cam' },

  // Europe
  { id: 'london-eye', name: 'London Eye & Thames', lat: 51.5033, lon: -0.1196, feedUrl: 'https://www.youtube.com/embed/LrcmQa6dCGg', feedType: 'youtube', source: 'EarthCam', thumbnailEmoji: '🎡', description: 'London Eye and River Thames view' },
  { id: 'paris-eiffel', name: 'Eiffel Tower', lat: 48.8584, lon: 2.2945, feedUrl: 'https://www.youtube.com/embed/cFhlz0dc8JQ', feedType: 'youtube', source: 'Paris Live', thumbnailEmoji: '🗼', description: 'Live view of the Eiffel Tower' },
  { id: 'heathrow', name: 'Heathrow Airport', lat: 51.47, lon: -0.4543, feedUrl: 'https://www.youtube.com/embed/Wy-SZtJlX_o', feedType: 'youtube', source: 'Airport Webcam', thumbnailEmoji: '✈️', description: 'Heathrow Airport runway operations' },
  { id: 'rome-colosseum', name: 'Rome Colosseum', lat: 41.8902, lon: 12.4922, feedUrl: 'https://www.youtube.com/embed/S-1cLnXrkbg', feedType: 'youtube', source: 'Skyline Webcams', thumbnailEmoji: '🏛️', description: 'Live view of the Roman Colosseum' },

  // Asia
  { id: 'tokyo-shibuya', name: 'Shibuya Crossing', lat: 35.6595, lon: 139.7004, feedUrl: 'https://www.youtube.com/embed/gFRtAAmiFbE', feedType: 'youtube', source: 'Shibuya TV', thumbnailEmoji: '🏙️', description: 'World\'s busiest pedestrian crossing' },
  { id: 'dubai-burj', name: 'Burj Khalifa', lat: 25.1972, lon: 55.2744, feedUrl: 'https://www.youtube.com/embed/lot1m_YgQwA', feedType: 'youtube', source: 'Dubai Live', thumbnailEmoji: '🏗️', description: 'Live view of Burj Khalifa and Downtown Dubai' },
  { id: 'singapore-changi', name: 'Changi Airport', lat: 1.3644, lon: 103.9915, feedUrl: 'https://www.youtube.com/embed/rL8phdRIRU0', feedType: 'youtube', source: 'Airport Webcam', thumbnailEmoji: '✈️', description: 'Singapore Changi Airport operations' },
  { id: 'narita', name: 'Narita Airport', lat: 35.7647, lon: 140.3864, feedUrl: 'https://www.youtube.com/embed/kSMzMw5TYpY', feedType: 'youtube', source: 'Airport Webcam', thumbnailEmoji: '✈️', description: 'Tokyo Narita Airport runway view' },
  { id: 'hong-kong', name: 'Hong Kong Harbour', lat: 22.2855, lon: 114.158, feedUrl: 'https://www.youtube.com/embed/QCmfXnkuEcw', feedType: 'youtube', source: 'Skyline Webcams', thumbnailEmoji: '🌃', description: 'Victoria Harbour panoramic view' },

  // Oceania
  { id: 'sydney-opera', name: 'Sydney Opera House', lat: -33.8568, lon: 151.2153, feedUrl: 'https://www.youtube.com/embed/ZaGCMbcJh1g', feedType: 'youtube', source: 'EarthCam', thumbnailEmoji: '🎭', description: 'Sydney Opera House and Harbour Bridge' },

  // Nature / Polar
  { id: 'northern-lights', name: 'Northern Lights (Iceland)', lat: 64.1466, lon: -21.9426, feedUrl: 'https://www.youtube.com/embed/eiPsyJC-kqE', feedType: 'youtube', source: 'Live Aurora', thumbnailEmoji: '🌌', description: 'Aurora Borealis live cam from Reykjavik' },
  { id: 'volcano-iceland', name: 'Iceland Volcano', lat: 63.879, lon: -22.069, feedUrl: 'https://www.youtube.com/embed/BA-9QzIcr3c', feedType: 'youtube', source: 'RÚV', thumbnailEmoji: '🌋', description: 'Live volcanic activity in Iceland' },
];

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearbyFeeds(lat: number, lon: number, radiusKm = 2000): (CameraFeed & { distance: number })[] {
  const global = CAMERA_FEEDS.filter(f => f.global).map(f => ({ ...f, distance: 0 }));
  const nearby = CAMERA_FEEDS
    .filter(f => !f.global)
    .map(f => ({ ...f, distance: haversineDistance(lat, lon, f.lat, f.lon) }))
    .filter(f => f.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
  return [...global, ...nearby];
}
