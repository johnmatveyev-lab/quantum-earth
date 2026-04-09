import { useTrackingStore } from '@/store/useTrackingStore';
import { Plane, Satellite, Rocket, Activity } from 'lucide-react';

export function WidgetStats() {
    const { aircraft, satellites, rockets } = useTrackingStore();

    const stats = [
        { label: 'AIRCRAFT', value: aircraft.length, icon: <Plane size={14} />, color: 'text-primary' },
        { label: 'SATELLITES', value: satellites.length, icon: <Satellite size={14} />, color: 'text-accent' },
        { label: 'ROCKETS', value: rockets.length, icon: <Rocket size={14} />, color: 'text-glow-warning' },
        { label: 'TOTAL', value: aircraft.length + satellites.length + rockets.length, icon: <Activity size={14} />, color: 'text-foreground' },
    ];

    return (
        <div className="h-full grid grid-cols-2 gap-2 p-2">
            {stats.map(s => (
                <div key={s.label} className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/10 border border-border">
                    <span className={`${s.color} mb-1`}>{s.icon}</span>
                    <span className={`font-mono text-lg font-bold ${s.color}`}>{s.value}</span>
                    <span className="font-mono text-[7px] text-muted-foreground tracking-wider">{s.label}</span>
                </div>
            ))}
        </div>
    );
}
