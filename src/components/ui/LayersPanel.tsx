import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Eye, EyeOff, X, Thermometer, TreePine, Waves, Cloud,
  Droplets, Globe, MapPin, Compass, Radio, Sun, Moon, Zap, Mountain, TrendingUp,
} from 'lucide-react';
import { useTrackingStore, GlobeLayer } from '@/store/useTrackingStore';

interface LayerInfo {
  id: GlobeLayer;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  color: string;
}

const LAYERS: LayerInfo[] = [
  // Imagery
  { id: 'infrared', name: 'Infrared', description: 'Thermal radiation false-color view', icon: <Thermometer size={14} />, category: 'Imagery', color: 'text-red-400' },
  { id: 'vegetation', name: 'Vegetation (NDVI)', description: 'Normalized vegetation index overlay', icon: <TreePine size={14} />, category: 'Imagery', color: 'text-green-400' },
  { id: 'seaTemp', name: 'Sea Surface Temp', description: 'Ocean temperature gradient visualization', icon: <Waves size={14} />, category: 'Imagery', color: 'text-orange-400' },
  { id: 'terrain', name: 'Terrain Relief', description: 'Exaggerated topographic shading', icon: <Mountain size={14} />, category: 'Imagery', color: 'text-amber-500' },

  // Atmosphere
  { id: 'clouds', name: 'Cloud Cover', description: 'Animated cloud layer over Earth', icon: <Cloud size={14} />, category: 'Atmosphere', color: 'text-gray-300' },
  { id: 'waterVapor', name: 'Water Vapor', description: 'Atmospheric moisture visualization', icon: <Droplets size={14} />, category: 'Atmosphere', color: 'text-cyan-400' },
  { id: 'precipitation', name: 'Precipitation', description: 'Rain and snow intensity overlay', icon: <Droplets size={14} />, category: 'Atmosphere', color: 'text-blue-400' },
  { id: 'aurora', name: 'Aurora Borealis', description: 'Polar aurora light effects', icon: <Zap size={14} />, category: 'Atmosphere', color: 'text-emerald-400' },
  { id: 'atmosphere', name: 'Atmosphere Glow', description: 'Atmospheric rim lighting effect', icon: <Sun size={14} />, category: 'Atmosphere', color: 'text-blue-300' },

  // Lighting
  { id: 'nightLights', name: 'Night Lights', description: 'City lights on the dark side of Earth', icon: <Moon size={14} />, category: 'Lighting', color: 'text-yellow-300' },

  // Data Overlays
  { id: 'orbits', name: 'Orbital Paths', description: 'LEO, MEO, GEO orbit ring visualization', icon: <Radio size={14} />, category: 'Data Overlays', color: 'text-purple-400' },
  { id: 'heatmap', name: 'Traffic Heatmap', description: 'Aircraft density heat visualization', icon: <MapPin size={14} />, category: 'Data Overlays', color: 'text-rose-400' },
  { id: 'corridors', name: 'Satellite Pass Grid', description: 'Dotted pass lines and geospatial grid', icon: <Compass size={14} />, category: 'Data Overlays', color: 'text-sky-400' },
  { id: 'graticule', name: 'Grid / Graticule', description: 'Latitude/longitude reference grid', icon: <Globe size={14} />, category: 'Data Overlays', color: 'text-slate-400' },
  { id: 'countryBorders', name: 'Country Borders', description: 'National boundary outlines', icon: <MapPin size={14} />, category: 'Data Overlays', color: 'text-teal-400' },
  { id: 'predictions', name: 'Trajectory Prediction', description: 'AI-predicted flight/orbit paths', icon: <TrendingUp size={14} />, category: 'Data Overlays', color: 'text-indigo-400' },
];

const CATEGORIES = ['Imagery', 'Atmosphere', 'Lighting', 'Data Overlays'];

export function LayersPanel() {
  const { layersPanelOpen, toggleLayersPanel, activeLayers, toggleLayer } = useTrackingStore();

  return (
    <AnimatePresence>
      {layersPanelOpen && (
        <motion.div
          initial={{ x: 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 280, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-16 right-3 bottom-16 w-[260px] z-30 glass-panel hud-border rounded-xl overflow-hidden flex flex-col scan-line"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-primary" />
              <h2 className="font-display text-[10px] tracking-[0.2em] text-foreground">
                MAP LAYERS
              </h2>
            </div>
            <button
              onClick={toggleLayersPanel}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Active count */}
          <div className="px-4 py-2 border-b border-border/20">
            <span className="font-mono text-[8px] text-muted-foreground tracking-wider">
              {activeLayers.size} ACTIVE LAYERS
            </span>
          </div>

          {/* Layer list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-3">
            {CATEGORIES.map(category => {
              const categoryLayers = LAYERS.filter(l => l.category === category);
              return (
                <div key={category}>
                  <div className="px-2 py-1">
                    <span className="font-display text-[8px] tracking-[0.25em] text-muted-foreground/70 uppercase">
                      {category}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {categoryLayers.map(layer => {
                      const active = activeLayers.has(layer.id);
                      return (
                        <button
                          key={layer.id}
                          onClick={() => toggleLayer(layer.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all group ${
                            active
                              ? 'bg-muted/40 border border-border/40'
                              : 'hover:bg-muted/20 border border-transparent'
                          }`}
                        >
                          <span className={`${active ? layer.color : 'text-muted-foreground/50'} transition-colors`}>
                            {layer.icon}
                          </span>
                          <div className="flex-1 text-left">
                            <div className={`font-mono text-[9px] tracking-wide transition-colors ${
                              active ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {layer.name}
                            </div>
                            <div className="font-mono text-[7px] text-muted-foreground/60 leading-tight mt-0.5">
                              {layer.description}
                            </div>
                          </div>
                          <span className={`transition-colors ${active ? 'text-primary' : 'text-muted-foreground/30'}`}>
                            {active ? <Eye size={12} /> : <EyeOff size={12} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border/20 flex gap-2">
            <button
              onClick={() => {
                LAYERS.forEach(l => {
                  if (!activeLayers.has(l.id)) toggleLayer(l.id);
                });
              }}
              className="flex-1 font-mono text-[7px] tracking-wider text-primary hover:bg-primary/10 rounded py-1.5 transition-colors"
            >
              ENABLE ALL
            </button>
            <button
              onClick={() => {
                LAYERS.forEach(l => {
                  if (activeLayers.has(l.id)) toggleLayer(l.id);
                });
              }}
              className="flex-1 font-mono text-[7px] tracking-wider text-muted-foreground hover:bg-muted/20 rounded py-1.5 transition-colors"
            >
              DISABLE ALL
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
