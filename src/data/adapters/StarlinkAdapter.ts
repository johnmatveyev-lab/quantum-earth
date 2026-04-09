import { TrackingDataProvider, TrackableObject } from '../types';

export class StarlinkAdapter implements TrackingDataProvider {
  getAircraft(): TrackableObject[] { return []; }
  getSatellites(): TrackableObject[] {
    // TODO: Fetch Starlink constellation data
    return [];
  }
  getRockets(): TrackableObject[] { return []; }
  update(_deltaTime: number): void {}
}
