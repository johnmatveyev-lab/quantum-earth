import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Clock, Rewind, FastForward } from 'lucide-react';
import { useTrackingStore } from '@/store/useTrackingStore';

export function TimelineController() {
  const {
    timelinePosition, setTimelinePosition,
    timelinePlaying, setTimelinePlaying,
    simulationSpeed, setSimulationSpeed,
  } = useTrackingStore();

  // Convert position to time display (0 = 24h ago, 1 = now)
  const getTimeLabel = (pos: number) => {
    const hoursAgo = (1 - pos) * 24;
    if (hoursAgo < 0.05) return 'NOW';
    if (hoursAgo < 1) return `${Math.round(hoursAgo * 60)}m ago`;
    return `${hoursAgo.toFixed(1)}h ago`;
  };

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-20 sm:bottom-16 left-1/2 -translate-x-1/2 z-20 glass-panel hud-border rounded-xl px-4 py-2 flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-[calc(100vw-24px)] sm:max-w-lg"
    >
      <Clock size={12} className="text-muted-foreground flex-shrink-0" />

      {/* Playback controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setTimelinePosition(Math.max(0, timelinePosition - 0.1))}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <SkipBack size={11} />
        </button>
        <button
          onClick={() => setSimulationSpeed(Math.max(0.1, simulationSpeed / 2))}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Rewind size={11} />
        </button>
        <button
          onClick={() => setTimelinePlaying(!timelinePlaying)}
          className="p-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
        >
          {timelinePlaying ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <button
          onClick={() => setSimulationSpeed(Math.min(10, simulationSpeed * 2))}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <FastForward size={11} />
        </button>
        <button
          onClick={() => setTimelinePosition(Math.min(1, timelinePosition + 0.1))}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <SkipForward size={11} />
        </button>
      </div>

      {/* Timeline slider */}
      <div className="flex-1 flex items-center gap-2">
        <span className="font-mono text-[8px] text-muted-foreground w-10 text-right">-24h</span>
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={timelinePosition}
            onChange={(e) => setTimelinePosition(parseFloat(e.target.value))}
            className="w-full h-1 accent-primary cursor-pointer"
          />
        </div>
        <span className="font-mono text-[8px] text-primary w-10">NOW</span>
      </div>

      {/* Time display */}
      <div className="flex-shrink-0 text-right">
        <div className="font-mono text-[10px] text-primary glow-text">
          {getTimeLabel(timelinePosition)}
        </div>
        <div className="font-mono text-[7px] text-muted-foreground">
          {simulationSpeed.toFixed(1)}x
        </div>
      </div>
    </motion.div>
  );
}
