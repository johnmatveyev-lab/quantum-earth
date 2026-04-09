import { motion } from 'framer-motion';
import { Search, Plane, Satellite, Rocket, ChevronRight, Bookmark, Sparkles, Loader2, Ship } from 'lucide-react';
import { useTrackingStore } from '@/store/useTrackingStore';
import { TrackableObject } from '@/data/types';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { isNLPQuery, nlpToFilters } from '@/utils/nlpSearch';

type FilterType = 'all' | 'aircraft' | 'satellite' | 'rocket' | 'vessel';

export function ObjectList() {
  const {
    aircraft, satellites, rockets,
    showAircraft, showSatellites, showRockets,
    vessels, showVessels,
    searchQuery, setSearchQuery, setSelectedObject, selectedObject,
    activeFilters,
  } = useTrackingStore();

  const [filter, setFilter] = useState<FilterType>('all');
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpActive, setNlpActive] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounced NLP search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (isNLPQuery(value)) {
      setNlpActive(true);
      setNlpLoading(true);
      debounceRef.current = setTimeout(async () => {
        const filters = await nlpToFilters(value);
        if (filters) {
          useTrackingStore.getState().setActiveFilters(filters);
        }
        setNlpLoading(false);
      }, 800);
    } else {
      setNlpActive(false);
      setNlpLoading(false);
      if (value === '') {
        useTrackingStore.getState().clearFilters();
      }
    }
  }, [setSearchQuery]);

  const allObjects = useMemo(() => {
    let objects: TrackableObject[] = [];

    if (filter === 'all') {
      if (showAircraft) objects.push(...aircraft);
      if (showSatellites) objects.push(...satellites);
      if (showRockets) objects.push(...rockets);
    } else if (filter === 'aircraft' && showAircraft) {
      objects = [...aircraft];
    } else if (filter === 'satellite' && showSatellites) {
      objects = [...satellites];
    } else if (filter === 'rocket' && showRockets) {
      objects = [...rockets];
    } else if (filter === 'vessel' && showVessels) {
      objects = [...vessels];
    }

    if (filter === 'all' && showVessels) {
      objects.push(...vessels);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      objects = objects.filter(o =>
        o.name.toLowerCase().includes(q) ||
        o.callsign?.toLowerCase().includes(q)
      );
    }

    // Advanced filters
    if (activeFilters.types && activeFilters.types.length > 0) {
      objects = objects.filter(o => activeFilters.types.includes(o.type));
    }
    if (activeFilters.altitudeMin !== undefined) {
      objects = objects.filter(o => o.altitude >= activeFilters.altitudeMin!);
    }
    if (activeFilters.altitudeMax !== undefined) {
      objects = objects.filter(o => o.altitude <= activeFilters.altitudeMax!);
    }
    if (activeFilters.speedMin !== undefined) {
      objects = objects.filter(o => o.speed >= activeFilters.speedMin!);
    }
    if (activeFilters.speedMax !== undefined) {
      objects = objects.filter(o => o.speed <= activeFilters.speedMax!);
    }
    if (activeFilters.callsignPattern) {
      const pattern = activeFilters.callsignPattern.replace(/\*/g, '.*');
      const re = new RegExp(pattern, 'i');
      objects = objects.filter(o => o.callsign && re.test(o.callsign));
    }
    if (activeFilters.country) {
      const c = activeFilters.country.toLowerCase();
      objects = objects.filter(o => o.country?.toLowerCase().includes(c) || o.origin?.toLowerCase().includes(c));
    }

    return objects.slice(0, 40);
  }, [aircraft, satellites, rockets, vessels, showAircraft, showSatellites, showRockets, showVessels, searchQuery, filter, activeFilters]);

  const typeIcon: Record<string, React.ReactNode> = {
    aircraft: <Plane size={11} className="text-primary" />,
    satellite: <Satellite size={11} className="text-accent" />,
    rocket: <Rocket size={11} className="text-glow-warning" />,
    vessel: <Ship size={11} className="text-cyan-400" />,
  };

  const filters: { key: FilterType; label: string; color: string }[] = [
    { key: 'all', label: 'ALL', color: 'text-foreground' },
    { key: 'aircraft', label: 'AIR', color: 'text-primary' },
    { key: 'satellite', label: 'SAT', color: 'text-accent' },
    { key: 'rocket', label: 'RKT', color: 'text-glow-warning' },
    { key: 'vessel', label: 'SHIP', color: 'text-cyan-400' },
  ];

  return (
    <motion.div
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-20 left-3 sm:top-16 z-20 glass-panel hud-border rounded-xl w-[calc(100vw-24px)] sm:w-64 max-h-[40vh] sm:max-h-[calc(100vh-140px)] flex flex-col"
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="font-display text-[9px] tracking-[0.25em] text-muted-foreground">
            TRACKED OBJECTS
          </div>
          <Bookmark size={10} className="text-muted-foreground" />
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/20 border border-border transition-all focus-within:border-primary/30 focus-within:bg-muted/30">
          {nlpLoading ? (
            <Loader2 size={12} className="text-secondary animate-spin" />
          ) : nlpActive ? (
            <Sparkles size={12} className="text-secondary animate-pulse" />
          ) : (
            <Search size={12} className="text-muted-foreground" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={nlpActive ? 'AI-powered search...' : 'Search objects...'}
            className="bg-transparent text-[11px] font-mono text-foreground placeholder:text-muted-foreground outline-none flex-1"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0.5 px-3 pb-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-1.5 rounded-md text-[8px] font-mono tracking-wider transition-all ${filter === f.key
              ? `bg-primary/10 ${f.key === 'all' ? 'text-primary' : f.color} border border-primary/25`
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="overflow-y-auto scrollbar-thin flex-1 px-2 pb-2 space-y-0.5">
        {allObjects.map((obj, idx) => {
          const isActive = selectedObject?.id === obj.id;
          return (
            <motion.button
              key={obj.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.01, duration: 0.3 }}
              onClick={() => setSelectedObject(obj)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all text-left group ${isActive
                ? 'glass-panel-active'
                : 'hover:bg-muted/20 hover:translate-x-0.5'
                }`}
            >
              <div className={`transition-transform ${isActive ? 'scale-125' : 'group-hover:scale-110'}`}>
                {typeIcon[obj.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono text-foreground truncate">{obj.name}</div>
                <div className="text-[8px] font-mono text-muted-foreground">
                  {obj.altitude.toFixed(0)}km · {obj.speed.toFixed(0)}km/h
                </div>
              </div>
              <ChevronRight size={10} className={`text-muted-foreground transition-all ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0'}`} />
            </motion.button>
          );
        })}
      </div>

      {/* Count */}
      <div className="px-3 py-2 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[8px] text-muted-foreground tracking-wider">
            {allObjects.length} / {aircraft.length + satellites.length + rockets.length}
          </span>
          <div className="flex gap-1">
            <span className="w-1 h-1 rounded-full bg-primary" />
            <span className="w-1 h-1 rounded-full bg-accent" />
            <span className="w-1 h-1 rounded-full bg-glow-warning" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
