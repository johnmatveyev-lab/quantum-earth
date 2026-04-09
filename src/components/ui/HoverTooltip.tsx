import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrackingStore } from '@/store/useTrackingStore';
import { Plane, Satellite, Rocket, ArrowUpRight, Gauge, MapPin, Crosshair } from 'lucide-react';

export function HoverTooltip() {
  const { hoveredObject } = useTrackingStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const typeConfig = {
    aircraft: { icon: <Plane size={11} className="text-primary" />, color: 'text-primary', border: 'border-primary/25', glow: 'hsla(195, 100%, 50%, 0.1)' },
    satellite: { icon: <Satellite size={11} className="text-accent" />, color: 'text-accent', border: 'border-accent/25', glow: 'hsla(165, 80%, 45%, 0.1)' },
    rocket: { icon: <Rocket size={11} className="text-glow-warning" />, color: 'text-glow-warning', border: 'border-glow-warning/25', glow: 'hsla(30, 100%, 55%, 0.1)' },
  };

  return (
    <AnimatePresence>
      {hoveredObject && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={`fixed z-50 glass-panel rounded-lg px-3 py-2.5 pointer-events-none border ${typeConfig[hoveredObject.type].border}`}
          style={{
            left: mousePos.x + 20,
            top: mousePos.y - 15,
            boxShadow: `0 0 24px ${typeConfig[hoveredObject.type].glow}, 0 4px 20px hsla(220, 30%, 0%, 0.4)`,
          }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            {typeConfig[hoveredObject.type].icon}
            <span className={`font-display text-[10px] tracking-wider ${typeConfig[hoveredObject.type].color}`}>
              {hoveredObject.name}
            </span>
          </div>
          <div className="space-y-1.5">
            <TooltipRow icon={<ArrowUpRight size={8} />} label="ALT" value={`${hoveredObject.altitude.toFixed(1)} km`} />
            <TooltipRow icon={<Gauge size={8} />} label="SPD" value={`${hoveredObject.speed.toFixed(0)} km/h`} />
            <TooltipRow icon={<Crosshair size={8} />} label="POS" value={`${hoveredObject.latitude.toFixed(2)}°, ${hoveredObject.longitude.toFixed(2)}°`} />
          </div>
          <div className="mt-2 pt-1.5 border-t border-border/50">
            <span className="font-mono text-[7px] text-muted-foreground tracking-wider">CLICK TO INSPECT</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TooltipRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[9px] font-mono">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground w-6">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
