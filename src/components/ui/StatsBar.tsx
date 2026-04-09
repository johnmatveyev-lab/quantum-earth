import { motion } from 'framer-motion';
import { Plane, Satellite, Rocket, Globe, Signal, BarChart3, TrendingUp, Ship } from 'lucide-react';
import { useTrackingStore } from '@/store/useTrackingStore';
import { useMemo, useState, useEffect } from 'react';

export function StatsBar() {
  const { aircraft, satellites, rockets, vessels, simulationSpeed, dataSource } = useTrackingStore();

  const avgAlt = useMemo(() => {
    if (aircraft.length === 0) return 0;
    return aircraft.reduce((s, a) => s + a.altitude, 0) / aircraft.length;
  }, [aircraft]);

  const avgSatAlt = useMemo(() => {
    if (satellites.length === 0) return 0;
    return satellites.reduce((s, a) => s + a.altitude, 0) / satellites.length;
  }, [satellites]);

  const altDist = useMemo(() => {
    const bands = [0, 0, 0, 0, 0];
    [...aircraft, ...satellites, ...rockets].forEach(o => {
      if (o.altitude < 10) bands[0]++;
      else if (o.altitude < 100) bands[1]++;
      else if (o.altitude < 500) bands[2]++;
      else if (o.altitude < 1000) bands[3]++;
      else bands[4]++;
    });
    return bands;
  }, [aircraft, satellites, rockets]);

  const maxBand = Math.max(...altDist, 1);
  const total = aircraft.length + satellites.length + rockets.length + vessels.length;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-3 left-3 right-3 z-20 glass-panel hud-border rounded-xl px-4 py-2.5 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-4">
        <StatBlock icon={<Plane size={12} />} label="AIRCRAFT" value={aircraft.length} sub={`~${avgAlt.toFixed(0)}km`} color="text-primary" />
        <StatDivider />
        <StatBlock icon={<Satellite size={12} />} label="SATELLITES" value={satellites.length} sub={`~${avgSatAlt.toFixed(0)}km`} color="text-accent" />
        <StatDivider />
        <StatBlock icon={<Rocket size={12} />} label="LAUNCHES" value={rockets.length} sub="ACTIVE" color="text-glow-warning" />
        <StatDivider />
        <StatBlock icon={<Ship size={12} />} label="VESSELS" value={vessels.length} sub="AIS" color="text-cyan-400" />
        <StatDivider />
        <StatBlock icon={<Globe size={12} />} label="TOTAL" value={total} sub="TRACKED" color="text-foreground" />
      </div>

      {/* Charts section */}
      <div className="hidden md:flex items-center gap-3">
        <StatDivider />

        {/* Altitude distribution */}
        <div className="flex items-center gap-2">
          <BarChart3 size={10} className="text-muted-foreground" />
          <div className="flex items-end gap-[2px] h-5">
            {altDist.map((v, i) => {
              const colors = ['bg-primary/70', 'bg-primary/60', 'bg-accent/60', 'bg-accent/50', 'bg-secondary/50'];
              return (
                <motion.div
                  key={i}
                  animate={{ height: `${(v / maxBand) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`w-[5px] rounded-t-sm ${colors[i]} transition-all`}
                  style={{ minHeight: v > 0 ? 2 : 0 }}
                />
              );
            })}
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[6px] text-muted-foreground leading-none">ALT</span>
            <span className="font-mono text-[6px] text-muted-foreground leading-none">DIST</span>
          </div>
        </div>

        <StatDivider />

        {/* Signal indicator */}
        <div className="flex items-center gap-1.5">
          <Signal size={10} className={`animate-pulse-glow ${dataSource === 'live' ? 'text-accent' : 'text-muted-foreground'}`} />
          <div>
            <div className={`font-mono text-[8px] tracking-wider ${dataSource === 'live' ? 'text-accent glow-text-accent' : 'text-muted-foreground'}`}>
              {dataSource === 'live' ? 'LIVE' : 'SIM'}
            </div>
            <div className="font-mono text-[6px] text-muted-foreground">{simulationSpeed.toFixed(1)}x</div>
          </div>
        </div>

        <StatDivider />

        {/* Throughput indicator */}
        <div className="flex items-center gap-1.5">
          <TrendingUp size={10} className="text-primary" />
          <div>
            <div className="font-mono text-[8px] text-primary tracking-wider">60</div>
            <div className="font-mono text-[6px] text-muted-foreground">FPS</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatBlock({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number | string;
  sub: string; color: string;
}) {
  return (
    <div className="flex items-center gap-2 group">
      <span className={`${color} transition-transform group-hover:scale-110`}>{icon}</span>
      <div>
        <div className={`font-mono text-sm font-bold leading-none ${color} telemetry-value`}>{value}</div>
        <div className="font-mono text-[6px] text-muted-foreground tracking-[0.15em] mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function StatDivider() {
  return <div className="h-6 w-px bg-gradient-to-b from-transparent via-border to-transparent" />;
}
