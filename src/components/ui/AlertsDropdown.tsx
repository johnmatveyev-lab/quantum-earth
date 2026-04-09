import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, Info, X } from 'lucide-react';
import type { Anomaly } from '@/hooks/useAnomalyAlerts';

interface AlertsDropdownProps {
  anomalies: Anomaly[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const severityColors = {
  low: 'text-primary border-primary/30',
  medium: 'text-glow-warning border-glow-warning/30',
  high: 'text-destructive border-destructive/30',
};

const severityIcons = {
  low: <Info size={10} />,
  medium: <AlertTriangle size={10} />,
  high: <AlertTriangle size={10} />,
};

export function AlertsDropdown({ anomalies, unreadCount, onMarkRead, onMarkAllRead }: AlertsDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-mono tracking-wider transition-all relative ${
          unreadCount > 0
            ? 'text-glow-warning bg-glow-warning/10 border border-glow-warning/30'
            : 'text-muted-foreground hover:text-foreground border border-transparent'
        }`}
      >
        <Bell size={10} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground text-[7px] flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-72 max-h-80 overflow-y-auto glass-panel hud-border rounded-lg z-50"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="font-display text-[9px] tracking-[0.2em] text-muted-foreground">ANOMALY ALERTS</span>
              {unreadCount > 0 && (
                <button onClick={onMarkAllRead} className="text-[8px] font-mono text-primary hover:text-foreground">
                  MARK ALL READ
                </button>
              )}
            </div>

            {anomalies.length === 0 ? (
              <div className="p-4 text-center">
                <span className="font-mono text-[9px] text-muted-foreground">No anomalies detected</span>
              </div>
            ) : (
              <div className="p-1.5 space-y-1">
                {anomalies.slice(0, 20).map(a => (
                  <button
                    key={a.id}
                    onClick={() => onMarkRead(a.id)}
                    className={`w-full text-left p-2 rounded-md transition-all hover:bg-muted/20 ${
                      a.read ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={severityColors[a.severity]}>{severityIcons[a.severity]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[9px] text-foreground">{a.title}</div>
                        <div className="font-mono text-[8px] text-muted-foreground truncate">{a.description}</div>
                        <div className="font-mono text-[7px] text-muted-foreground mt-0.5">
                          {new Date(a.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      {!a.read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
