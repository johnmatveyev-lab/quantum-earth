import { create } from 'zustand';
import { TrackableObject } from '@/data/types';

export type GlobeLayer =
  | 'infrared'
  | 'vegetation'
  | 'seaTemp'
  | 'waterVapor'
  | 'nightLights'
  | 'clouds'
  | 'aurora'
  | 'atmosphere'
  | 'graticule'
  | 'orbits'
  | 'heatmap'
  | 'corridors'
  | 'countryBorders'
  | 'precipitation'
  | 'terrain'
  | 'predictions';

interface AIAnalysis {
  summary: string;
  predictions?: any[];
  risks?: any[];
  anomalies?: any[];
  loading: boolean;
  lastUpdated: number | null;
}

export interface ActiveFilters {
  altitudeMin?: number;
  altitudeMax?: number;
  speedMin?: number;
  speedMax?: number;
  types: ('aircraft' | 'satellite' | 'rocket' | 'vessel')[];
  callsignPattern?: string;
  country?: string;
  operator?: string;
}

export interface Geofence {
  id: string;
  name: string;
  polygon: { lat: number; lon: number }[];
  alertOnEnter: boolean;
  alertOnExit: boolean;
  color: string;
  active: boolean;
}

export interface WatchlistMeta {
  id: string;
  name: string;
  description?: string;
  color: string;
  itemCount: number;
}

interface TrackingState {
  aircraft: TrackableObject[];
  satellites: TrackableObject[];
  rockets: TrackableObject[];
  vessels: TrackableObject[];
  selectedObject: TrackableObject | null;
  hoveredObject: TrackableObject | null;
  comparedObjects: TrackableObject[];
  showAircraft: boolean;
  showSatellites: boolean;
  showRockets: boolean;
  showStarlink: boolean;
  showVessels: boolean;
  simulationSpeed: number;
  searchQuery: string;
  dataSource: 'simulation' | 'live';
  timelinePosition: number;
  timelinePlaying: boolean;
  aiAnalysis: AIAnalysis;
  aiPanelOpen: boolean;
  layersPanelOpen: boolean;
  activeLayers: Set<GlobeLayer>;
  copilotOpen: boolean;
  voiceActive: boolean;
  salActive: boolean;
  cameraFeedLocation: { lat: number; lon: number } | null;
  streetViewLocation: { lat: number; lon: number } | null;
  satelliteViewLocation: { lat: number; lon: number } | null;
  activeFilters: ActiveFilters;
  filterPanelOpen: boolean;
  geofences: Geofence[];
  geofenceDrawMode: boolean;
  watchlists: WatchlistMeta[];
  activeWatchlistId: string | null;
  watchlistPanelOpen: boolean;

  setAircraft: (a: TrackableObject[]) => void;
  setSatellites: (s: TrackableObject[]) => void;
  setRockets: (r: TrackableObject[]) => void;
  setVessels: (v: TrackableObject[]) => void;
  setSelectedObject: (o: TrackableObject | null) => void;
  setHoveredObject: (o: TrackableObject | null) => void;
  addComparedObject: (o: TrackableObject) => void;
  removeComparedObject: (id: string) => void;
  clearComparedObjects: () => void;
  toggleAircraft: () => void;
  toggleSatellites: () => void;
  toggleRockets: () => void;
  toggleStarlink: () => void;
  toggleVessels: () => void;
  selectExclusiveCategory: (category: 'aircraft' | 'satellites' | 'rockets' | 'starlink' | 'vessels' | 'all') => void;
  setSimulationSpeed: (s: number) => void;
  setSearchQuery: (q: string) => void;
  setDataSource: (s: 'simulation' | 'live') => void;
  setTimelinePosition: (p: number) => void;
  setTimelinePlaying: (p: boolean) => void;
  setAIAnalysis: (a: Partial<AIAnalysis>) => void;
  toggleAIPanel: () => void;
  toggleLayersPanel: () => void;
  toggleLayer: (layer: GlobeLayer) => void;
  isLayerActive: (layer: GlobeLayer) => boolean;
  setCopilotOpen: (open: boolean) => void;
  setVoiceActive: (active: boolean) => void;
  setSalActive: (active: boolean) => void;
  setCameraFeedLocation: (loc: { lat: number; lon: number } | null) => void;
  setStreetViewLocation: (loc: { lat: number; lon: number } | null) => void;
  setSatelliteViewLocation: (loc: { lat: number; lon: number } | null) => void;
  setActiveFilters: (f: Partial<ActiveFilters>) => void;
  clearFilters: () => void;
  toggleFilterPanel: () => void;
  setGeofences: (g: Geofence[]) => void;
  addGeofence: (g: Geofence) => void;
  removeGeofence: (id: string) => void;
  toggleGeofenceDrawMode: () => void;
  setWatchlists: (w: WatchlistMeta[]) => void;
  setActiveWatchlistId: (id: string | null) => void;
  toggleWatchlistPanel: () => void;
}

const DEFAULT_LAYERS: GlobeLayer[] = ['nightLights', 'aurora', 'atmosphere', 'orbits'];

export const useTrackingStore = create<TrackingState>((set, get) => ({
  aircraft: [],
  satellites: [],
  rockets: [],
  vessels: [],
  selectedObject: null,
  hoveredObject: null,
  comparedObjects: [],
  showAircraft: true,
  showSatellites: true,
  showRockets: true,
  showStarlink: true,
  showVessels: true,
  simulationSpeed: 1,
  searchQuery: '',
  dataSource: 'simulation',
  timelinePosition: 1,
  timelinePlaying: false,
  aiAnalysis: { summary: '', loading: false, lastUpdated: null },
  aiPanelOpen: false,
  layersPanelOpen: false,
  activeLayers: new Set(DEFAULT_LAYERS),
  copilotOpen: false,
  voiceActive: false,
  salActive: false,
  cameraFeedLocation: null,
  streetViewLocation: null,
  satelliteViewLocation: null,
  activeFilters: { types: [] },
  filterPanelOpen: false,
  geofences: [],
  geofenceDrawMode: false,
  watchlists: [],
  activeWatchlistId: null,
  watchlistPanelOpen: false,

  setAircraft: (aircraft) => set({ aircraft }),
  setSatellites: (satellites) => set({ satellites }),
  setRockets: (rockets) => set({ rockets }),
  setVessels: (vessels) => set({ vessels }),
  setSelectedObject: (selectedObject) => set({ selectedObject }),
  setHoveredObject: (hoveredObject) => set({ hoveredObject }),
  addComparedObject: (obj) => set((s) => {
    if (s.comparedObjects.length >= 3 || s.comparedObjects.some(o => o.id === obj.id)) return s;
    return { comparedObjects: [...s.comparedObjects, obj] };
  }),
  removeComparedObject: (id) => set((s) => ({
    comparedObjects: s.comparedObjects.filter(o => o.id !== id),
  })),
  clearComparedObjects: () => set({ comparedObjects: [] }),
  toggleAircraft: () => set((s) => ({ showAircraft: !s.showAircraft })),
  toggleSatellites: () => set((s) => ({ showSatellites: !s.showSatellites })),
  toggleRockets: () => set((s) => ({ showRockets: !s.showRockets })),
  toggleStarlink: () => set((s) => ({ showStarlink: !s.showStarlink })),
  toggleVessels: () => set((s) => ({ showVessels: !s.showVessels })),
  selectExclusiveCategory: (category) => set(() => ({
    showAircraft: category === 'aircraft' || category === 'all',
    showSatellites: category === 'satellites' || category === 'all',
    showRockets: category === 'rockets' || category === 'all',
    showStarlink: category === 'starlink' || category === 'all',
    showVessels: category === 'vessels' || category === 'all',
  })),
  setSimulationSpeed: (simulationSpeed) => set({ simulationSpeed }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setDataSource: (dataSource) => set({ dataSource }),
  setTimelinePosition: (timelinePosition) => set({ timelinePosition }),
  setTimelinePlaying: (timelinePlaying) => set({ timelinePlaying }),
  setAIAnalysis: (a) => set((s) => ({ aiAnalysis: { ...s.aiAnalysis, ...a } })),
  toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  toggleLayersPanel: () => set((s) => ({ layersPanelOpen: !s.layersPanelOpen })),
  toggleLayer: (layer) => set((s) => {
    const next = new Set(s.activeLayers);
    if (next.has(layer)) next.delete(layer);
    else next.add(layer);
    return { activeLayers: next };
  }),
  isLayerActive: (layer) => get().activeLayers.has(layer),
  setCopilotOpen: (copilotOpen) => set({ copilotOpen }),
  setVoiceActive: (voiceActive) => set({ voiceActive }),
  setSalActive: (salActive) => set({ salActive }),
  setCameraFeedLocation: (cameraFeedLocation) => set({ cameraFeedLocation }),
  setStreetViewLocation: (streetViewLocation) => set({ streetViewLocation }),
  setSatelliteViewLocation: (satelliteViewLocation) => set({ satelliteViewLocation }),
  setActiveFilters: (f) => set((s) => ({ activeFilters: { ...s.activeFilters, ...f } })),
  clearFilters: () => set({ activeFilters: { types: [] } }),
  toggleFilterPanel: () => set((s) => ({ filterPanelOpen: !s.filterPanelOpen })),
  setGeofences: (geofences) => set({ geofences }),
  addGeofence: (g) => set((s) => ({ geofences: [...s.geofences, g] })),
  removeGeofence: (id) => set((s) => ({ geofences: s.geofences.filter(g => g.id !== id) })),
  toggleGeofenceDrawMode: () => set((s) => ({ geofenceDrawMode: !s.geofenceDrawMode })),
  setWatchlists: (watchlists) => set({ watchlists }),
  setActiveWatchlistId: (activeWatchlistId) => set({ activeWatchlistId }),
  toggleWatchlistPanel: () => set((s) => ({ watchlistPanelOpen: !s.watchlistPanelOpen })),
}));
