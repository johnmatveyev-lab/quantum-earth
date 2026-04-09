import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface TrendChartProps {
    data: { label: string; aircraft: number; satellites: number; rockets: number }[];
    title?: string;
}

export function TrendChart({ data, title }: TrendChartProps) {
    return (
        <div className="glass-panel hud-border rounded-xl p-4">
            {title && <div className="font-display text-[10px] tracking-[0.2em] text-primary mb-3">{title}</div>}
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="gradAircraft" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradSatellites" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradRockets" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.4)' }} />
                    <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.4)' }} />
                    <Tooltip
                        contentStyle={{
                            background: 'rgba(0,0,0,0.8)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8,
                            fontSize: 10,
                        }}
                    />
                    <Area type="monotone" dataKey="aircraft" stroke="hsl(var(--primary))" fill="url(#gradAircraft)" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="satellites" stroke="hsl(var(--accent))" fill="url(#gradSatellites)" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="rockets" stroke="#f59e0b" fill="url(#gradRockets)" strokeWidth={1.5} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
