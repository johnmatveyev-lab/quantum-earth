import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, ArrowLeft, Trash2, Eye, EyeOff, FileUp, Satellite, MapPin, Table, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { parseKML } from '@/utils/parseKML';
import { parseTLE } from '@/utils/parseTLE';
import { useAuditLog } from '@/hooks/useAuditLog';

interface Overlay {
    id: string;
    name: string;
    overlay_type: string;
    data: any;
    file_size: number;
    active: boolean;
    created_at: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
    kml: <MapPin size={12} className="text-accent" />,
    geojson: <MapPin size={12} className="text-primary" />,
    tle: <Satellite size={12} className="text-glow-warning" />,
    csv: <Table size={12} className="text-secondary" />,
};

export default function DataIngestion() {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const { log } = useAuditLog();
    const [overlays, setOverlays] = useState<Overlay[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
    // Upload form
    const [uploadType, setUploadType] = useState<'kml' | 'tle' | 'csv'>('kml');
    const [uploadName, setUploadName] = useState('');
    const [pasteContent, setPasteContent] = useState('');
    const [parseResult, setParseResult] = useState<any>(null);

    useEffect(() => {
        if (!user) return;
        loadOverlays();
    }, [user]);

    async function loadOverlays() {
        const { data } = await (supabase as any)
            .from('custom_overlays')
            .select('*')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false });
        setOverlays(data || []);
        setLoading(false);
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            setPasteContent(content);
            setUploadName(file.name.replace(/\.[^.]+$/, ''));
            parseContent(content);
        };
        reader.readAsText(file);
    }

    function parseContent(content: string) {
        try {
            if (uploadType === 'kml') {
                const result = parseKML(content);
                setParseResult({ type: 'kml', count: result.length, data: result });
                toast.success(`Parsed ${result.length} placemarks`);
            } else if (uploadType === 'tle') {
                const result = parseTLE(content);
                setParseResult({ type: 'tle', count: result.length, data: result });
                toast.success(`Parsed ${result.length} satellites`);
            } else if (uploadType === 'csv') {
                const lines = content.trim().split('\n');
                const headers = lines[0]?.split(',').map(h => h.trim());
                const rows = lines.slice(1).map(l => {
                    const vals = l.split(',');
                    const obj: any = {};
                    headers?.forEach((h, i) => obj[h] = vals[i]?.trim());
                    return obj;
                });
                setParseResult({ type: 'csv', count: rows.length, headers, data: rows });
                toast.success(`Parsed ${rows.length} rows`);
            }
        } catch (e: any) {
            toast.error('Parse failed: ' + e.message);
            setParseResult(null);
        }
    }

    async function saveOverlay() {
        if (!parseResult || !uploadName.trim() || !user) return;
        setUploading(true);

        const { error } = await (supabase as any).from('custom_overlays').insert({
            user_id: user.id,
            name: uploadName.trim(),
            overlay_type: uploadType,
            data: parseResult.data,
            file_size: pasteContent.length,
            active: true,
        });

        if (error) { toast.error(error.message); setUploading(false); return; }

        await log('upload_overlay', 'custom_overlay', undefined, { type: uploadType, items: parseResult.count });
        setUploading(false);
        setPasteContent('');
        setParseResult(null);
        setUploadName('');
        loadOverlays();
        toast.success('Overlay saved');
    }

    async function toggleOverlay(id: string, active: boolean) {
        await (supabase as any).from('custom_overlays').update({ active: !active }).eq('id', id);
        loadOverlays();
    }

    async function deleteOverlay(id: string) {
        await (supabase as any).from('custom_overlays').delete().eq('id', id);
        await log('delete_overlay', 'custom_overlay', id);
        loadOverlays();
        toast.success('Overlay deleted');
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-3xl mx-auto">
                <button onClick={() => navigate('/app')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-body text-sm mb-8 transition-colors">
                    <ArrowLeft size={16} /> Back to Mission Control
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <Upload size={20} className="text-primary" />
                    <h1 className="font-display text-lg tracking-[0.3em] text-primary glow-text">DATA INGESTION</h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6">
                    {[
                        { key: 'upload' as const, label: 'UPLOAD', icon: <FileUp size={12} /> },
                        { key: 'manage' as const, label: 'MANAGE', icon: <FileText size={12} /> },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-mono tracking-wider transition-all ${activeTab === tab.key
                                    ? 'bg-primary/15 text-primary border border-primary/30'
                                    : 'text-muted-foreground hover:text-foreground border border-transparent'
                                }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'upload' ? (
                    <div className="space-y-4">
                        {/* Type selector */}
                        <div className="glass-panel hud-border rounded-xl p-4">
                            <div className="font-display text-[10px] tracking-[0.2em] text-muted-foreground mb-3">DATA TYPE</div>
                            <div className="flex gap-2">
                                {[
                                    { key: 'kml' as const, label: 'KML / KMZ', desc: 'Geographic overlays' },
                                    { key: 'tle' as const, label: 'TLE', desc: 'Satellite orbits' },
                                    { key: 'csv' as const, label: 'CSV', desc: 'Object catalog' },
                                ].map(t => (
                                    <button
                                        key={t.key}
                                        onClick={() => { setUploadType(t.key); setParseResult(null); setPasteContent(''); }}
                                        className={`flex-1 p-3 rounded-lg text-left transition-all ${uploadType === t.key
                                                ? 'bg-primary/15 border border-primary/30'
                                                : 'border border-border hover:border-primary/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {TYPE_ICONS[t.key]}
                                            <span className="font-display text-[10px] tracking-wider text-foreground">{t.label}</span>
                                        </div>
                                        <p className="font-mono text-[8px] text-muted-foreground mt-1">{t.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Upload area */}
                        <div className="glass-panel hud-border rounded-xl p-4">
                            <input
                                value={uploadName}
                                onChange={(e) => setUploadName(e.target.value)}
                                placeholder="Overlay name..."
                                className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 mb-3"
                            />

                            {/* File input */}
                            <label className="block w-full cursor-pointer border-2 border-dashed border-border hover:border-primary/30 rounded-lg p-6 text-center transition-all mb-3">
                                <FileUp size={24} className="text-muted-foreground mx-auto mb-2" />
                                <p className="font-body text-xs text-muted-foreground">Click to upload a file</p>
                                <p className="font-mono text-[8px] text-muted-foreground mt-1">.kml, .tle, .csv</p>
                                <input type="file" accept=".kml,.kmz,.tle,.txt,.csv" onChange={handleFileUpload} className="hidden" />
                            </label>

                            {/* Paste area */}
                            <div className="font-mono text-[8px] text-muted-foreground mb-1">Or paste content:</div>
                            <textarea
                                value={pasteContent}
                                onChange={(e) => setPasteContent(e.target.value)}
                                placeholder={uploadType === 'tle' ? 'ISS (ZARYA)\n1 25544U 98067A   ...\n2 25544  51.6...' : 'Paste content here...'}
                                className="w-full h-32 bg-muted/30 border border-border rounded-lg px-3 py-2 text-[10px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                            />

                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => parseContent(pasteContent)}
                                    disabled={!pasteContent.trim()}
                                    className="px-4 py-2 rounded-lg bg-accent/20 border border-accent/40 text-accent font-display text-[9px] tracking-[0.2em] disabled:opacity-50"
                                >
                                    PARSE
                                </button>
                                {parseResult && (
                                    <button
                                        onClick={saveOverlay}
                                        disabled={uploading}
                                        className="px-4 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary font-display text-[9px] tracking-[0.2em] disabled:opacity-50"
                                    >
                                        {uploading ? 'SAVING...' : `SAVE (${parseResult.count} items)`}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Parse preview */}
                        {parseResult && (
                            <div className="glass-panel hud-border rounded-xl p-4">
                                <div className="font-display text-[10px] tracking-[0.2em] text-accent mb-2">PARSED: {parseResult.count} ITEMS</div>
                                <div className="max-h-40 overflow-y-auto scrollbar-thin">
                                    {parseResult.data.slice(0, 20).map((item: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2 py-1 border-b border-border/30">
                                            <span className="font-mono text-[9px] text-foreground">{item.name || item.noradId || `Row ${i + 1}`}</span>
                                            {item.type && <span className="font-mono text-[7px] text-muted-foreground">{item.type}</span>}
                                            {item.inclination != null && <span className="font-mono text-[7px] text-muted-foreground">inc: {item.inclination.toFixed(1)}°</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Manage tab */
                    <div>
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2].map(i => (
                                    <div key={i} className="glass-panel rounded-lg p-3 animate-pulse"><div className="h-4 bg-muted/30 rounded w-1/2" /></div>
                                ))}
                            </div>
                        ) : overlays.length === 0 ? (
                            <div className="glass-panel hud-border rounded-xl p-8 text-center">
                                <Upload size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
                                <p className="font-body text-sm text-muted-foreground">No custom data uploaded</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {overlays.map((ov, i) => (
                                    <motion.div
                                        key={ov.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="glass-panel rounded-lg p-3 flex items-center gap-3"
                                    >
                                        {TYPE_ICONS[ov.overlay_type]}
                                        <div className="flex-1">
                                            <p className="font-body text-sm text-foreground">{ov.name}</p>
                                            <p className="font-mono text-[8px] text-muted-foreground">
                                                {ov.overlay_type.toUpperCase()} · {(ov.file_size / 1024).toFixed(1)} KB · {new Date(ov.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button onClick={() => toggleOverlay(ov.id, ov.active)} className={`p-1.5 rounded transition-colors ${ov.active ? 'text-accent' : 'text-muted-foreground'}`}>
                                            {ov.active ? <Eye size={12} /> : <EyeOff size={12} />}
                                        </button>
                                        <button onClick={() => deleteOverlay(ov.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                                            <Trash2 size={12} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
