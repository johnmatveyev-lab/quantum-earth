import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import RGL, { ResponsiveGridLayout } from 'react-grid-layout';
import { ArrowLeft, Save, Plus, X, BarChart3, Table, Bell, MessageSquare, Globe, CloudSun } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { WidgetObjectTable } from '@/components/widgets/WidgetObjectTable';
import { WidgetStats } from '@/components/widgets/WidgetStats';
import { WidgetAlertsFeed } from '@/components/widgets/WidgetAlertsFeed';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface WidgetConfig {
    i: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

const WIDGET_CATALOG = [
    { type: 'stats', label: 'Statistics', icon: <BarChart3 size={14} />, defaultW: 4, defaultH: 4 },
    { type: 'objectTable', label: 'Object Table', icon: <Table size={14} />, defaultW: 4, defaultH: 6 },
    { type: 'alertsFeed', label: 'Alerts Feed', icon: <Bell size={14} />, defaultW: 4, defaultH: 5 },
    { type: 'globeMini', label: 'Globe View', icon: <Globe size={14} />, defaultW: 6, defaultH: 6 },
    { type: 'weather', label: 'Weather', icon: <CloudSun size={14} />, defaultW: 3, defaultH: 3 },
    { type: 'aiChat', label: 'AI Copilot', icon: <MessageSquare size={14} />, defaultW: 4, defaultH: 5 },
];

const TEMPLATES: Record<string, WidgetConfig[]> = {
    'Aviation Monitor': [
        { i: 'w1', type: 'stats', x: 0, y: 0, w: 4, h: 4 },
        { i: 'w2', type: 'objectTable', x: 4, y: 0, w: 4, h: 6 },
        { i: 'w3', type: 'alertsFeed', x: 8, y: 0, w: 4, h: 6 },
    ],
    'OSINT Workstation': [
        { i: 'w1', type: 'objectTable', x: 0, y: 0, w: 6, h: 6 },
        { i: 'w2', type: 'alertsFeed', x: 6, y: 0, w: 6, h: 4 },
        { i: 'w3', type: 'stats', x: 6, y: 4, w: 6, h: 3 },
    ],
    'Satellite Ops': [
        { i: 'w1', type: 'stats', x: 0, y: 0, w: 6, h: 4 },
        { i: 'w2', type: 'objectTable', x: 6, y: 0, w: 6, h: 8 },
        { i: 'w3', type: 'alertsFeed', x: 0, y: 4, w: 6, h: 4 },
    ],
};

function renderWidget(type: string) {
    switch (type) {
        case 'stats': return <WidgetStats />;
        case 'objectTable': return <WidgetObjectTable />;
        case 'alertsFeed': return <WidgetAlertsFeed />;
        case 'globeMini': return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <Globe size={32} className="text-primary/30 mx-auto mb-2" />
                    <span className="font-mono text-[9px] text-muted-foreground">Globe Preview</span>
                </div>
            </div>
        );
        case 'weather': return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <CloudSun size={24} className="text-accent/40 mx-auto mb-1" />
                    <span className="font-mono text-[9px] text-muted-foreground">Weather Widget</span>
                </div>
            </div>
        );
        case 'aiChat': return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <MessageSquare size={24} className="text-secondary/40 mx-auto mb-1" />
                    <span className="font-mono text-[9px] text-muted-foreground">AI Chat</span>
                </div>
            </div>
        );
        default: return <div className="p-2 text-[9px] text-muted-foreground">Unknown widget</div>;
    }
}

export default function DashboardEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const [dashboardName, setDashboardName] = useState('');
    const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [saving, setSaving] = useState(false);
    const [widgetCounter, setWidgetCounter] = useState(0);

    useEffect(() => {
        if (!id || !user) return;
        supabase
            .from('saved_dashboards')
            .select('*')
            .eq('id', id)
            .single()
            .then(({ data }: any) => {
                if (data) {
                    setDashboardName(data.name);
                    const layout = data.layout || [];
                    setWidgets(layout);
                    setWidgetCounter(layout.length);
                }
            });
    }, [id, user]);

    const addWidget = useCallback((type: string) => {
        const catalog = WIDGET_CATALOG.find(w => w.type === type);
        if (!catalog) return;
        const newId = `w${widgetCounter + 1}`;
        setWidgets(prev => [...prev, {
            i: newId,
            type,
            x: 0,
            y: Infinity,
            w: catalog.defaultW,
            h: catalog.defaultH,
        }]);
        setWidgetCounter(c => c + 1);
    }, [widgetCounter]);

    const removeWidget = useCallback((widgetId: string) => {
        setWidgets(prev => prev.filter(w => w.i !== widgetId));
    }, []);

    const onLayoutChange = useCallback((layout: any[]) => {
        setWidgets(prev => prev.map(w => {
            const l = layout.find((item: any) => item.i === w.i);
            return l ? { ...w, x: l.x, y: l.y, w: l.w, h: l.h } : w;
        }));
    }, []);

    const loadTemplate = (name: string) => {
        setWidgets(TEMPLATES[name] || []);
        setWidgetCounter((TEMPLATES[name] || []).length);
        toast.success(`Loaded "${name}" template`);
    };

    async function save() {
        if (!id) return;
        setSaving(true);
        const { error } = await supabase
            .from('saved_dashboards')
            .update({ layout: widgets as any })
            .eq('id', id);
        setSaving(false);
        if (error) toast.error('Failed to save');
        else toast.success('Dashboard saved');
    }

    const gridLayout = widgets.map(w => ({ i: w.i, x: w.x, y: w.y, w: w.w, h: w.h, minW: 2, minH: 2 }));

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            {sidebarOpen && (
                <motion.aside
                    initial={{ x: -240 }}
                    animate={{ x: 0 }}
                    className="w-60 border-r border-border bg-background/80 backdrop-blur-lg flex flex-col"
                >
                    <div className="p-4 border-b border-border">
                        <div className="font-display text-[10px] tracking-[0.2em] text-primary mb-3">WIDGET LIBRARY</div>
                        <div className="space-y-1">
                            {WIDGET_CATALOG.map(w => (
                                <button
                                    key={w.type}
                                    onClick={() => addWidget(w.type)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body text-foreground hover:bg-muted/20 transition-colors text-left"
                                >
                                    <span className="text-primary">{w.icon}</span>
                                    {w.label}
                                    <Plus size={10} className="ml-auto text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border-b border-border">
                        <div className="font-display text-[10px] tracking-[0.2em] text-accent mb-3">TEMPLATES</div>
                        <div className="space-y-1">
                            {Object.keys(TEMPLATES).map(name => (
                                <button
                                    key={name}
                                    onClick={() => loadTemplate(name)}
                                    className="w-full px-3 py-2 rounded-lg text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors text-left"
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 mt-auto">
                        <button
                            onClick={() => navigate('/dashboards')}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-xs font-body transition-colors"
                        >
                            <ArrowLeft size={14} /> All Dashboards
                        </button>
                    </div>
                </motion.aside>
            )}

            {/* Main */}
            <div className="flex-1 flex flex-col">
                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground">
                            {sidebarOpen ? <X size={16} /> : <Plus size={16} />}
                        </button>
                        <input
                            value={dashboardName}
                            onChange={(e) => setDashboardName(e.target.value)}
                            className="font-display text-sm tracking-wider text-primary bg-transparent border-none focus:outline-none"
                            placeholder="Dashboard name..."
                        />
                    </div>
                    <button
                        onClick={save}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary font-display text-[9px] tracking-[0.2em] hover:bg-primary/30 transition-all disabled:opacity-50"
                    >
                        <Save size={12} />
                        {saving ? 'SAVING...' : 'SAVE'}
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 p-4 overflow-auto">
                    {widgets.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Plus size={32} className="text-muted-foreground/20 mx-auto mb-3" />
                                <p className="font-body text-sm text-muted-foreground">Add widgets from the sidebar or load a template</p>
                            </div>
                        </div>
                    ) : (
                        <ResponsiveGridLayout
                            className="layout"
                            layouts={{ lg: gridLayout }}
                            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                            rowHeight={40}
                            width={1200}
                            onLayoutChange={onLayoutChange}
                        >
                            {widgets.map(w => (
                                <div key={w.i} className="glass-panel hud-border rounded-xl overflow-hidden group">
                                    <button
                                        onClick={() => removeWidget(w.i)}
                                        className="absolute top-1 right-1 z-10 p-1 rounded bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={8} />
                                    </button>
                                    {renderWidget(w.type)}
                                </div>
                            ))}
                        </ResponsiveGridLayout>
                    )}
                </div>
            </div>
        </div>
    );
}
