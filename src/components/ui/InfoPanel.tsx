import { motion, AnimatePresence } from 'framer-motion';
import { X, Plane, Satellite, Rocket, Navigation, Gauge, MapPin, ArrowUpRight, Radio, Crosshair, Compass, Activity, Shield, Plus } from 'lucide-react';
import { useTrackingStore } from '@/store/useTrackingStore';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export function InfoPanel() {
  const { selectedObject, setSelectedObject, watchlists } = useTrackingStore();
  const { user } = useAuth();

  const typeConfig = {
    aircraft: { icon: <Plane size={16} />, color: 'text-primary', badge: 'bg-primary/15 text-primary border-primary/30', dot: 'bg-primary glow-dot', glowColor: 'hsla(195, 100%, 50%, 0.15)' },
    satellite: { icon: <Satellite size={16} />, color: 'text-accent', badge: 'bg-accent/15 text-accent border-accent/30', dot: 'bg-accent glow-dot-accent', glowColor: 'hsla(165, 80%, 45%, 0.15)' },
    rocket: { icon: <Rocket size={16} />, color: 'text-glow-warning', badge: 'bg-glow-warning/15 text-glow-warning border-glow-warning/30', dot: 'bg-glow-warning glow-dot-warning', glowColor: 'hsla(30, 100%, 55%, 0.15)' },
  };

  return (
    <AnimatePresence>
      {selectedObject && (
        <motion.div
          key={selectedObject.id}
          initial={{ x: 100, opacity: 0, scale: 0.95 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 100, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-16 right-3 z-20 glass-panel hud-border rounded-xl w-80 overflow-hidden"
          style={{ boxShadow: `0 0 40px ${typeConfig[selectedObject.type].glowColor}` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border hud-grid">
            <div className="flex items-center gap-2.5">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className={`p-1.5 rounded-lg ${typeConfig[selectedObject.type].badge} border`}
              >
                {typeConfig[selectedObject.type].icon}
              </motion.div>
              <div>
                <div className="font-display text-[11px] tracking-wider text-foreground">
                  {selectedObject.name}
                </div>
                <div className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase">
                  {selectedObject.type} · {selectedObject.status}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedObject(null)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-muted/30 rounded"
            >
              <X size={14} />
            </button>
          </div>

          {/* Telemetry */}
          <div className="p-4 space-y-3">
            <div className="font-mono text-[8px] text-muted-foreground tracking-[0.25em] uppercase">
              <Activity size={8} className="inline mr-1.5" />
              TELEMETRY DATA
            </div>

            <div className="grid grid-cols-2 gap-2">
              <TelemetryCard
                icon={<ArrowUpRight size={12} />}
                label="ALTITUDE"
                value={selectedObject.altitude}
                unit="km"
                color={typeConfig[selectedObject.type].color}
                decimals={1}
              />
              <TelemetryCard
                icon={<Gauge size={12} />}
                label="VELOCITY"
                value={selectedObject.speed}
                unit="km/h"
                color={typeConfig[selectedObject.type].color}
                decimals={0}
              />
              <TelemetryCard
                icon={<Compass size={12} />}
                label="HEADING"
                value={selectedObject.heading}
                unit="°"
                color={typeConfig[selectedObject.type].color}
                decimals={1}
              />
              <TelemetryCard
                icon={<Shield size={12} />}
                label="SIGNAL"
                value={-1}
                unit=""
                color={typeConfig[selectedObject.type].color}
                decimals={0}
                text={selectedObject.status.toUpperCase()}
              />
            </div>

            {/* Coordinates */}
            <div className="mt-3 p-3 rounded-lg holo-card">
              <div className="font-mono text-[8px] text-muted-foreground tracking-[0.2em] mb-2">
                <MapPin size={8} className="inline mr-1" />POSITION
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-mono text-[7px] text-muted-foreground">LAT</div>
                  <AnimatedNumber value={selectedObject.latitude} decimals={4} className={`font-mono text-xs ${typeConfig[selectedObject.type].color} telemetry-value`} suffix="°" />
                </div>
                <div>
                  <div className="font-mono text-[7px] text-muted-foreground">LON</div>
                  <AnimatedNumber value={selectedObject.longitude} decimals={4} className={`font-mono text-xs ${typeConfig[selectedObject.type].color} telemetry-value`} suffix="°" />
                </div>
              </div>
            </div>

            {/* Route info */}
            {selectedObject.origin && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-3 rounded-lg holo-card"
              >
                <div className="font-mono text-[8px] text-muted-foreground tracking-[0.2em] mb-2">
                  <Navigation size={8} className="inline mr-1" />FLIGHT ROUTE
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs text-primary">{selectedObject.origin}</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-primary/50 via-primary/20 to-primary/50 relative">
                    <motion.div
                      animate={{ left: ['10%', '90%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-primary rounded-full glow-dot"
                    />
                  </div>
                  <span className="font-display text-xs text-primary">{selectedObject.destination}</span>
                </div>
                {selectedObject.callsign && (
                  <div className="mt-2 font-mono text-[9px] text-muted-foreground">
                    CALLSIGN: <span className="text-foreground">{selectedObject.callsign}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2 pt-1">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse-glow ${typeConfig[selectedObject.type].dot}`} />
              <span className="font-mono text-[8px] text-muted-foreground tracking-wider">
                LIVE TRACKING · SIGNAL NOMINAL
              </span>
            </div>

            {/* Add to Watchlist */}
            {user && watchlists.length > 0 && (
              <div className="pt-2">
                <select
                  defaultValue=""
                  onChange={async (e) => {
                    const wlId = e.target.value;
                    if (!wlId) return;
                    const { error } = await (supabase as any).from('watchlist_items').insert({
                      watchlist_id: wlId, user_id: user.id,
                      object_id: selectedObject.id, object_name: selectedObject.name, object_type: selectedObject.type,
                    });
                    if (error) {
                      if (error.code === '23505') toast({ title: 'Already in watchlist' });
                      else toast({ title: 'Error', description: error.message, variant: 'destructive' });
                    } else {
                      toast({ title: `Added to watchlist` });
                    }
                    e.target.value = '';
                  }}
                  className="w-full bg-muted/20 border border-border rounded-lg px-2 py-1.5 text-[9px] font-mono text-muted-foreground focus:outline-none focus:border-accent/50 cursor-pointer"
                >
                  <option value="">⊕ ADD TO WATCHLIST</option>
                  {watchlists.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AnimatedNumber({ value, decimals, className, suffix = '' }: {
  value: number; decimals: number; className: string; suffix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (Math.abs(diff) < 0.001) { setDisplay(value); return; }
    const startTime = performance.now();
    const duration = 400;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <span className={className}>{display.toFixed(decimals)}{suffix}</span>;
}

function TelemetryCard({ icon, label, value, unit, color, decimals, text }: {
  icon: React.ReactNode; label: string; value: number;
  unit: string; color: string; decimals: number; text?: string;
}) {
  return (
    <div className="p-2.5 rounded-lg holo-card group">
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">{icon}</span>
        <span className="font-mono text-[7px] text-muted-foreground tracking-[0.15em]">{label}</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        {text ? (
          <span className={`font-mono text-sm font-bold ${color} telemetry-value`}>{text}</span>
        ) : (
          <>
            <AnimatedNumber value={value} decimals={decimals} className={`font-mono text-sm font-bold ${color} telemetry-value`} />
            <span className="font-mono text-[8px] text-muted-foreground">{unit}</span>
          </>
        )}
      </div>
    </div>
  );
}
