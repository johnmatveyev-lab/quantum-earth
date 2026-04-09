import { Plane, Satellite, Rocket } from 'lucide-react';
import { useTrackingStore } from '@/store/useTrackingStore';

export function WidgetObjectTable() {
    const { aircraft, satellites, rockets, setSelectedObject } = useTrackingStore();
    const all = [...aircraft.slice(0, 8), ...satellites.slice(0, 8), ...rockets.slice(0, 4)];

    const icons: Record<string, React.ReactNode> = {
        aircraft: <Plane size={10} className="text-primary" />,
        satellite: <Satellite size={10} className="text-accent" />,
        rocket: <Rocket size={10} className="text-glow-warning" />,
    };

    return (
        <div className="h-full flex flex-col">
            <div className="font-mono text-[8px] text-muted-foreground tracking-wider px-2 py-1.5 border-b border-border">
                TRACKED OBJECTS ({aircraft.length + satellites.length + rockets.length})
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {all.map(obj => (
                    <button
                        key={obj.id}
                        onClick={() => setSelectedObject(obj)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/20 text-left transition-colors border-b border-border/30"
                    >
                        {icons[obj.type]}
                        <span className="font-mono text-[9px] text-foreground truncate flex-1">{obj.name}</span>
                        <span className="font-mono text-[8px] text-muted-foreground">{obj.altitude.toFixed(0)}km</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
