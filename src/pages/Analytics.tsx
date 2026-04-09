import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, ArrowLeft, Download, Plane, Satellite, Rocket, Globe, TrendingUp, MapPin } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTrackingStore } from '@/store/useTrackingStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TrendChart } from '@/components/charts/TrendChart';
import { generatePDF } from '@/utils/generatePDF';

const COLORS = ['hsl(195, 100%, 50%)', 'hsl(170, 100%, 50%)', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
    const navigate = useNavigate();
    const { aircraft, satellites, rockets } = useTrackingStore();
    const reportRef = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);

    // Composition
    const composition = [
        { name: 'Aircraft', value: aircraft.length, icon: <Plane size={12} /> },
        { name: 'Satellites', value: satellites.length, icon: <Satellite size={12} /> },
        { name: 'Rockets', value: rockets.length, icon: <Rocket size={12} /> },
    ];

    // Altitude distribution
    const altBuckets = useMemo(() => {
        const all = [...aircraft, ...satellites, ...rockets];
        const buckets = [
            { label: '0-5km', min: 0, max: 5, count: 0 },
            { label: '5-15km', min: 5, max: 15, count: 0 },
            { label: '15-100km', min: 15, max: 100, count: 0 },
            { label: '100-500km', min: 100, max: 500, count: 0 },
            { label: '500-2000km', min: 500, max: 2000, count: 0 },
            { label: '2000+km', min: 2000, max: Infinity, count: 0 },
        ];
        all.forEach(obj => {
            const b = buckets.find(b => obj.altitude >= b.min && obj.altitude < b.max);
            if (b) b.count++;
        });
        return buckets.map(b => ({ label: b.label, count: b.count }));
    }, [aircraft, satellites, rockets]);

    // Country distribution (top 8)
    const countryData = useMemo(() => {
        const counts: Record<string, number> = {};
        [...aircraft, ...satellites, ...rockets].forEach(obj => {
            const c = (obj as any).country || 'Unknown';
            counts[c] = (counts[c] || 0) + 1;
        });
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([name, value]) => ({ name, value }));
    }, [aircraft, satellites, rockets]);

    // Simulated trend data (24h)
    const trendData = useMemo(() => {
        const now = new Date();
        return Array.from({ length: 24 }, (_, i) => {
            const hour = new Date(now.getTime() - (23 - i) * 3600000);
            const jitter = (seed: number) => Math.max(0, Math.round(seed + (Math.random() - 0.5) * seed * 0.3));
            return {
                label: `${hour.getHours().toString().padStart(2, '0')}:00`,
                aircraft: jitter(aircraft.length),
                satellites: jitter(satellites.length),
                rockets: jitter(rockets.length),
            };
        });
    }, [aircraft.length, satellites.length, rockets.length]);

    // Speed distribution
    const speedBuckets = useMemo(() => {
        const buckets = [
            { label: '0-200', min: 0, max: 200, count: 0 },
            { label: '200-500', min: 200, max: 500, count: 0 },
            { label: '500-1000', min: 500, max: 1000, count: 0 },
            { label: '1000+', min: 1000, max: Infinity, count: 0 },
        ];
        [...aircraft, ...satellites, ...rockets].forEach(obj => {
            const b = buckets.find(b => obj.speed >= b.min && obj.speed < b.max);
            if (b) b.count++;
        });
        return buckets.map(b => ({ label: b.label + ' km/h', count: b.count }));
    }, [aircraft, satellites, rockets]);

    async function exportReport() {
        setExporting(true);
        try {
            await generatePDF('analyticsReport', 'Intelligence Report');
            toast.success('PDF exported');
        } catch (e: any) {
            toast.error('Export failed: ' + e.message);
        }
        setExporting(false);
    }

    const tooltipStyle = {
        contentStyle: { background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 },
    };

    const totalObjects = aircraft.length + satellites.length + rockets.length;

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate('/app')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-body text-sm transition-colors">
                        <ArrowLeft size={16} /> Back
                    </button>
                    <button
                        onClick={exportReport}
                        disabled={exporting || totalObjects === 0}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent/20 border border-accent/40 text-accent font-display text-[9px] tracking-[0.2em] hover:bg-accent/30 transition-all disabled:opacity-50"
                    >
                        <Download size={12} /> {exporting ? 'EXPORTING...' : 'EXPORT PDF'}
                    </button>
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <BarChart3 size={20} className="text-accent" />
                    <h1 className="font-display text-lg tracking-[0.3em] text-accent glow-text">ANALYTICS</h1>
                    <span className="font-mono text-[8px] text-muted-foreground ml-2">{totalObjects} objects tracked</span>
                </div>

                {totalObjects === 0 ? (
                    <div className="glass-panel hud-border rounded-xl p-12 text-center mt-12">
                        <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h2 className="font-display tracking-widest text-lg text-foreground mb-2">NO DATA AVAILABLE</h2>
                        <p className="font-mono text-xs text-muted-foreground max-w-sm mx-auto">
                            Activate tracking layers in the main dashboard HUD to begin collecting telemetry and generating intelligence reports.
                        </p>
                    </div>
                ) : (
                    <div id="analyticsReport" ref={reportRef}>
                        {/* Stats row */}
                        <div className="grid grid-cols-4 gap-3 mb-6">
                            {[
                                { label: 'TOTAL OBJECTS', value: aircraft.length + satellites.length + rockets.length, icon: <Globe size={14} className="text-primary" /> },
                                { label: 'AIRCRAFT', value: aircraft.length, icon: <Plane size={14} className="text-primary" /> },
                                { label: 'SATELLITES', value: satellites.length, icon: <Satellite size={14} className="text-accent" /> },
                                { label: 'AVG ALTITUDE', value: `${Math.round([...aircraft, ...satellites, ...rockets].reduce((s, o) => s + o.altitude, 0) / Math.max(1, aircraft.length + satellites.length + rockets.length))} km`, icon: <TrendingUp size={14} className="text-glow-warning" /> },
                            ].map(stat => (
                                <div key={stat.label} className="glass-panel hud-border rounded-xl p-3 text-center">
                                    <div className="mx-auto mb-1">{stat.icon}</div>
                                    <div className="font-mono text-lg font-bold text-foreground">{stat.value}</div>
                                    <div className="font-display text-[7px] tracking-[0.2em] text-muted-foreground">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Trend */}
                        <TrendChart data={trendData} title="24-HOUR ACTIVITY TREND" />

                        {/* Charts grid */}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {/* Composition pie */}
                            <div className="glass-panel hud-border rounded-xl p-4">
                                <div className="font-display text-[10px] tracking-[0.2em] text-primary mb-3">OBJECT COMPOSITION</div>
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie data={composition} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" stroke="none">
                                            {composition.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                                        </Pie>
                                        <Tooltip {...tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex justify-center gap-4 mt-2">
                                    {composition.map((c, i) => (
                                        <div key={c.name} className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                            <span className="font-mono text-[8px] text-muted-foreground">{c.name} ({c.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Altitude distribution */}
                            <div className="glass-panel hud-border rounded-xl p-4">
                                <div className="font-display text-[10px] tracking-[0.2em] text-accent mb-3">ALTITUDE DISTRIBUTION</div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={altBuckets}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.4)' }} />
                                        <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.4)' }} />
                                        <Tooltip {...tooltipStyle} />
                                        <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Country */}
                        <div className="glass-panel hud-border rounded-xl p-4">
                            <div className="font-display text-[10px] tracking-[0.2em] text-secondary mb-3">TOP COUNTRIES / OPERATORS</div>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={countryData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis type="number" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.4)' }} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.4)' }} width={60} />
                                    <Tooltip {...tooltipStyle} />
                                    <Bar dataKey="value" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Speed */}
                        <div className="glass-panel hud-border rounded-xl p-4">
                            <div className="font-display text-[10px] tracking-[0.2em] text-glow-warning mb-3">SPEED DISTRIBUTION</div>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={speedBuckets}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.4)' }} />
                                    <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.4)' }} />
                                    <Tooltip {...tooltipStyle} />
                                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
