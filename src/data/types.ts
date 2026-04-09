export type TrackableType = 'aircraft' | 'satellite' | 'rocket' | 'vessel';

export interface TrackableObject {
  id: string;
  name: string;
  type: TrackableType;
  latitude: number;
  longitude: number;
  altitude: number; // km
  speed: number; // km/h
  heading: number; // degrees
  callsign?: string;
  origin?: string;
  destination?: string;
  country?: string;
  operator?: string;
  icao24?: string;
  status: 'active' | 'ascending' | 'descending' | 'orbiting';
}

export interface TrackingDataProvider {
  getAircraft(): TrackableObject[];
  getSatellites(): TrackableObject[];
  getRockets(): TrackableObject[];
  update(deltaTime: number): void;
}
