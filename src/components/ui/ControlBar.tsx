import { motion } from 'framer-motion';
import { Plane, Satellite, Rocket, Radio, Timer, Brain, Wifi, WifiOff, LogIn, Layers, Globe, Filter, ClipboardList, Hexagon } from 'lucide-react';
import { useTrackingStore } from '@/store/useTrackingStore';
import { useState, useEffect } from 'react';
import { UserMenu } from './UserMenu';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AlertsDropdown } from './AlertsDropdown';
import { useAnomalyAlerts } from '@/hooks/useAnomalyAlerts';

export function ControlBar() {
  const {
    showAircraft, showSatellites, showRockets, showStarlink,
    selectExclusiveCategory,
    simulationSpeed, setSimulationSpeed,
    aircraft, satellites, rockets,
    dataSource, setDataSource,
    aiPanelOpen, toggleAIPanel,
    layersPanelOpen, toggleLayersPanel,
    filterPanelOpen, toggleFilterPanel,
    watchlistPanelOpen, toggleWatchlistPanel,
    geofenceDrawMode, toggleGeofenceDrawMode,
  } = useTrackingStore();

  const { user } = useAuth();
  const navigate = useNavigate();
  const [clock, setClock] = useState('');
  const { anomalies, unreadCount, markRead, markAllRead } = useAnomalyAlerts();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-3 left-3 right-3 z-20 glass-panel hud-border rounded-xl px-4 py-2.5 flex items-center gap-3 scan-line"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-1">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow glow-dot" />
        <h1 className="font-display text-[11px] tracking-[0.3em] text-primary glow-text">
          SKYWATCH
        </h1>
      </div>

      <Divider />

      {/* Clock */}
      <div className="hidden md:flex items-center gap-2">
        <Timer size={11} className="text-muted-foreground" />
        <span className="font-mono text-[9px] text-muted-foreground tracking-wider">{clock}</span>
      </div>

      <Divider className="hidden md:block" />

      {/* Category Toggles */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[50vw] sm:max-w-none">
        <LayerToggle active={showAircraft && showSatellites && showRockets && showStarlink} onClick={() => selectExclusiveCategory('all')} icon={<Globe size={12} />} label="ALL" count={aircraft.length + satellites.length + rockets.length} colorClass="text-foreground" shortcut="1" />
        <LayerToggle active={showAircraft && !showSatellites && !showRockets && !showStarlink} onClick={() => selectExclusiveCategory('aircraft')} icon={<Plane size={12} />} label="AIR" count={aircraft.length} colorClass="text-primary" shortcut="2" />
        <LayerToggle active={showSatellites && !showAircraft && !showRockets && !showStarlink} onClick={() => selectExclusiveCategory('satellites')} icon={<Satellite size={12} />} label="SAT" count={satellites.length} colorClass="text-accent" shortcut="3" />
        <LayerToggle active={showRockets && !showAircraft && !showSatellites && !showStarlink} onClick={() => selectExclusiveCategory('rockets')} icon={<Rocket size={12} />} label="RKT" count={rockets.length} colorClass="text-glow-warning" shortcut="4" />
        <LayerToggle active={showStarlink && !showAircraft && !showSatellites && !showRockets} onClick={() => selectExclusiveCategory('starlink')} icon={<Satellite size={12} />} label="SLK" count={0} colorClass="text-secondary" />
      </div>

      <Divider className="hidden sm:block" />

      {/* Speed */}
      <div className="hidden sm:flex items-center gap-1.5">
        <span className="font-mono text-[8px] text-muted-foreground">SPD</span>
        <input type="range" min={0.1} max={10} step={0.1} value={simulationSpeed}
          onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
          className="w-14 h-1 accent-primary cursor-pointer" />
        <span className="font-mono text-[9px] text-primary w-7">{simulationSpeed.toFixed(1)}x</span>
      </div>

      <Divider className="hidden sm:block" />

      {/* Data Source Toggle */}
      <button
        onClick={() => setDataSource(dataSource === 'simulation' ? 'live' : 'simulation')}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-mono tracking-wider transition-all ${dataSource === 'live'
          ? 'bg-accent/15 text-accent border border-accent/30'
          : 'text-muted-foreground hover:text-foreground border border-transparent'
          }`}
      >
        {dataSource === 'live' ? <Wifi size={10} /> : <WifiOff size={10} />}
        {dataSource === 'live' ? 'LIVE' : 'SIM'}
      </button>

      {/* Layers Toggle */}
      <button
        onClick={toggleLayersPanel}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-mono tracking-wider transition-all ${layersPanelOpen
          ? 'bg-primary/15 text-primary border border-primary/30'
          : 'text-muted-foreground hover:text-foreground border border-transparent'
          }`}
      >
        <Layers size={10} />
        LAYERS
      </button>

      {/* AI Panel Toggle */}
      <button
        onClick={toggleAIPanel}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-mono tracking-wider transition-all ${aiPanelOpen
          ? 'bg-secondary/15 text-secondary border border-secondary/30'
          : 'text-muted-foreground hover:text-foreground border border-transparent'
          }`}
      >
        <Brain size={10} />
        AI
      </button>

      {/* Filter Toggle */}
      <button
        onClick={toggleFilterPanel}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-mono tracking-wider transition-all ${filterPanelOpen
          ? 'bg-primary/15 text-primary border border-primary/30'
          : 'text-muted-foreground hover:text-foreground border border-transparent'
          }`}
      >
        <Filter size={10} />
        <span className="hidden sm:inline">FILTER</span>
      </button>

      {/* Watchlist Toggle */}
      <button
        onClick={toggleWatchlistPanel}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-mono tracking-wider transition-all ${watchlistPanelOpen
          ? 'bg-accent/15 text-accent border border-accent/30'
          : 'text-muted-foreground hover:text-foreground border border-transparent'
          }`}
      >
        <ClipboardList size={10} />
        <span className="hidden sm:inline">WATCH</span>
      </button>

      {/* Geofence Draw Toggle */}
      <button
        onClick={toggleGeofenceDrawMode}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-mono tracking-wider transition-all ${geofenceDrawMode
          ? 'bg-glow-warning/15 text-glow-warning border border-glow-warning/30 animate-pulse'
          : 'text-muted-foreground hover:text-foreground border border-transparent'
          }`}
      >
        <Hexagon size={10} />
        <span className="hidden sm:inline">FENCE</span>
      </button>

      {/* Anomaly Alerts */}
      <AlertsDropdown
        anomalies={anomalies}
        unreadCount={unreadCount}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />

      <div className="flex-1" />

      {/* Status */}
      <div className="hidden lg:flex items-center gap-1.5">
        <Radio size={9} className="text-accent animate-pulse-glow" />
        <span className="font-mono text-[8px] text-accent tracking-wider">ACTIVE</span>
      </div>

      <Divider className="hidden lg:block" />

      {/* User */}
      {user ? (
        <UserMenu />
      ) : (
        <button
          onClick={() => navigate('/auth')}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-mono tracking-wider text-primary hover:bg-primary/10 border border-primary/30 transition-all"
        >
          <LogIn size={10} />
          LOGIN
        </button>
      )}
    </motion.div>
  );
}

function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-5 w-px bg-border ${className}`} />;
}

function LayerToggle({ active, onClick, icon, label, count, colorClass, shortcut }: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  label: string; count: number; colorClass: string; shortcut?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={shortcut ? `Shortcut: ${shortcut}` : undefined}
      className={`flex items-center gap-1 px-1.5 py-1 rounded-md transition-all text-[8px] font-mono tracking-wider ${active ? `${colorClass} bg-muted/30` : 'text-muted-foreground opacity-50 hover:opacity-75'
        }`}
    >
      {icon}
      <span>{label}</span>
      {count > 0 && <span className="font-bold text-[9px]">{count}</span>}
    </button>
  );
}
