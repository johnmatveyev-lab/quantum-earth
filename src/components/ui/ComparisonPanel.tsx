import { motion, AnimatePresence } from 'framer-motion';
import { X, Plane, Satellite, Rocket, ArrowUpRight, Gauge, Compass } from 'lucide-react';
import { useTrackingStore } from '@/store/useTrackingStore';
import { TrackableObject } from '@/data/types';

const typeIcons = {
  aircraft: <Plane size={12} />,
  satellite: <Satellite size={12} />,
  rocket: <Rocket size={12} />,
};

const typeColors = {
  aircraft: 'text-primary',
  satellite: 'text-accent',
  rocket: 'text-glow-warning',
};

export function ComparisonPanel() {
  const { comparedObjects, removeComparedObject, clearComparedObjects } = useTrackingStore();

  if (comparedObjects.length < 2) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 glass-panel hud-border rounded-xl p-3 w-auto max-w-[90vw]"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-[9px] tracking-[0.2em] text-muted-foreground">COMPARISON</span>
          <button onClick={clearComparedObjects} className="text-muted-foreground hover:text-foreground">
            <X size={12} />
          </button>
        </div>

        <div className="flex gap-3">
          {comparedObjects.map((obj) => (
            <CompareCard key={obj.id} obj={obj} onRemove={() => removeComparedObject(obj.id)} />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function CompareCard({ obj, onRemove }: { obj: TrackableObject; onRemove: () => void }) {
  return (
    <div className="w-44 p-2.5 rounded-lg holo-card relative">
      <button onClick={onRemove} className="absolute top-1 right-1 text-muted-foreground hover:text-foreground">
        <X size={10} />
      </button>

      <div className="flex items-center gap-1.5 mb-2">
        <span className={typeColors[obj.type]}>{typeIcons[obj.type]}</span>
        <span className="font-display text-[10px] text-foreground truncate">{obj.name}</span>
      </div>

      <div className="space-y-1.5">
        <MetricRow icon={<ArrowUpRight size={9} />} label="ALT" value={`${obj.altitude.toFixed(1)} km`} color={typeColors[obj.type]} />
        <MetricRow icon={<Gauge size={9} />} label="SPD" value={`${obj.speed.toFixed(0)} km/h`} color={typeColors[obj.type]} />
        <MetricRow icon={<Compass size={9} />} label="HDG" value={`${obj.heading.toFixed(1)}°`} color={typeColors[obj.type]} />
      </div>
    </div>
  );
}

function MetricRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-mono text-[7px] text-muted-foreground">{label}</span>
      </div>
      <span className={`font-mono text-[9px] ${color}`}>{value}</span>
    </div>
  );
}
