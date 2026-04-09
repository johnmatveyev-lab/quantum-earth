import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, X, Plus, Trash2, Download, ChevronRight, FileText } from 'lucide-react';
import { useTrackingStore, WatchlistMeta } from '@/store/useTrackingStore';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { exportWatchlistJSON, exportWatchlistCSV } from '@/utils/exportData';

const WATCHLIST_COLORS = ['#00d4ff', '#a855f7', '#f97316', '#22c55e', '#ef4444', '#eab308'];

export function WatchlistPanel() {
    const { watchlistPanelOpen, toggleWatchlistPanel, watchlists, setWatchlists, activeWatchlistId, setActiveWatchlistId } = useTrackingStore();
    const { user } = useAuth();
    const [newName, setNewName] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [creating, setCreating] = useState(false);
    const [addEventTitle, setAddEventTitle] = useState('');

    // Load watchlists from DB
    useEffect(() => {
        if (!user || !watchlistPanelOpen) return;
        loadWatchlists();
    }, [user, watchlistPanelOpen]);

    // Load items when active watchlist changes
    useEffect(() => {
        if (!activeWatchlistId) { setItems([]); setEvents([]); return; }
        loadItems(activeWatchlistId);
        loadEvents(activeWatchlistId);
    }, [activeWatchlistId]);

    async function loadWatchlists() {
        const { data } = await (supabase as any).from('watchlists').select('*, watchlist_items(count)').eq('user_id', user!.id).order('created_at', { ascending: false });
        if (data) {
            setWatchlists(data.map((w: any) => ({
                id: w.id, name: w.name, description: w.description, color: w.color,
                itemCount: w.watchlist_items?.[0]?.count || 0,
            })));
        }
    }

    async function loadItems(watchlistId: string) {
        const { data } = await (supabase as any).from('watchlist_items').select('*').eq('watchlist_id', watchlistId).order('added_at', { ascending: false });
        setItems(data || []);
    }

    async function loadEvents(watchlistId: string) {
        const { data } = await (supabase as any).from('investigation_events').select('*').eq('watchlist_id', watchlistId).order('event_timestamp', { ascending: false }).limit(20);
        setEvents(data || []);
    }

    async function createWatchlist() {
        if (!newName.trim() || !user) return;
        const color = WATCHLIST_COLORS[watchlists.length % WATCHLIST_COLORS.length];
        const { data, error } = await (supabase as any).from('watchlists').insert({ user_id: user.id, name: newName.trim(), color }).select().single();
        if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
        setNewName('');
        setCreating(false);
        loadWatchlists();
        setActiveWatchlistId(data.id);
    }

    async function deleteWatchlist(id: string) {
        await (supabase as any).from('watchlists').delete().eq('id', id);
        if (activeWatchlistId === id) setActiveWatchlistId(null);
        loadWatchlists();
    }

    async function removeItem(id: string) {
        await (supabase as any).from('watchlist_items').delete().eq('id', id);
        loadItems(activeWatchlistId!);
        loadWatchlists();
    }

    async function addEvent() {
        if (!addEventTitle.trim() || !activeWatchlistId || !user) return;
        await (supabase as any).from('investigation_events').insert({ watchlist_id: activeWatchlistId, user_id: user.id, title: addEventTitle.trim(), event_type: 'note' });
        setAddEventTitle('');
        loadEvents(activeWatchlistId);
    }

    const activeWL = watchlists.find(w => w.id === activeWatchlistId);

    return (
        <AnimatePresence>
            {watchlistPanelOpen && (
                <motion.div
                    initial={{ x: -80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -80, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-16 left-3 z-30 glass-panel hud-border rounded-xl w-80 max-h-[70vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                        <div className="flex items-center gap-2">
                            <ClipboardList size={12} className="text-accent" />
                            <span className="font-display text-[9px] tracking-[0.25em] text-accent">
                                {activeWL ? activeWL.name.toUpperCase() : 'WATCHLISTS'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {activeWL && (
                                <button onClick={() => setActiveWatchlistId(null)} className="text-muted-foreground hover:text-foreground text-[8px] font-mono">BACK</button>
                            )}
                            <button onClick={toggleWatchlistPanel} className="text-muted-foreground hover:text-foreground">
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
                        {!activeWatchlistId ? (
                            <>
                                {/* Watchlist list */}
                                {watchlists.map(w => (
                                    <div key={w.id} className="flex items-center gap-2 group">
                                        <button
                                            onClick={() => setActiveWatchlistId(w.id)}
                                            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/10 border border-border hover:border-accent/30 transition-all text-left"
                                        >
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: w.color }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-body text-foreground truncate">{w.name}</div>
                                                <div className="text-[9px] font-mono text-muted-foreground">{w.itemCount} objects</div>
                                            </div>
                                            <ChevronRight size={12} className="text-muted-foreground" />
                                        </button>
                                        <button onClick={() => deleteWatchlist(w.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}

                                {watchlists.length === 0 && !creating && (
                                    <div className="text-center py-6">
                                        <ClipboardList size={24} className="text-muted-foreground/30 mx-auto mb-2" />
                                        <p className="text-[10px] font-mono text-muted-foreground">No watchlists yet</p>
                                    </div>
                                )}

                                {creating ? (
                                    <div className="flex gap-1.5">
                                        <input
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && createWatchlist()}
                                            placeholder="Watchlist name..."
                                            autoFocus
                                            className="flex-1 bg-muted/20 border border-border rounded px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
                                        />
                                        <button onClick={createWatchlist} className="px-2 py-1.5 rounded bg-accent/15 text-accent text-[9px] font-mono hover:bg-accent/25">GO</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setCreating(true)}
                                        className="w-full flex items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-accent hover:border-accent/30 transition-all text-[9px] font-mono"
                                    >
                                        <Plus size={10} />
                                        NEW WATCHLIST
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Items in active watchlist */}
                                <div className="font-mono text-[8px] text-muted-foreground tracking-wider mb-1">TRACKED OBJECTS</div>
                                {items.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground text-center py-2">No objects — add from the Info Panel</p>
                                )}
                                {items.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/10 border border-border group">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] font-body text-foreground truncate">{item.object_name}</div>
                                            <div className="text-[8px] font-mono text-muted-foreground">{item.object_type} · {item.object_id}</div>
                                        </div>
                                        <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                ))}

                                {/* Export buttons */}
                                <div className="flex gap-1.5 mt-2">
                                    <button onClick={() => exportWatchlistJSON(activeWL!, items, events)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-muted/20 text-muted-foreground text-[8px] font-mono hover:bg-muted/30">
                                        <Download size={9} /> JSON
                                    </button>
                                    <button onClick={() => exportWatchlistCSV(items)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-muted/20 text-muted-foreground text-[8px] font-mono hover:bg-muted/30">
                                        <Download size={9} /> CSV
                                    </button>
                                </div>

                                {/* Investigation timeline */}
                                <div className="font-mono text-[8px] text-muted-foreground tracking-wider mt-3 mb-1">INVESTIGATION TIMELINE</div>
                                <div className="flex gap-1.5 mb-1">
                                    <input
                                        value={addEventTitle}
                                        onChange={(e) => setAddEventTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addEvent()}
                                        placeholder="Add a note..."
                                        className="flex-1 bg-muted/20 border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
                                    />
                                    <button onClick={addEvent} className="px-2 rounded bg-accent/15 text-accent text-[9px] font-mono hover:bg-accent/25">+</button>
                                </div>
                                {events.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground text-center py-2">No events yet</p>
                                )}
                                <div className="space-y-1 relative pl-3">
                                    <div className="absolute left-1 top-1 bottom-1 w-px bg-border" />
                                    {events.map(ev => (
                                        <div key={ev.id} className="relative pl-3">
                                            <div className="absolute -left-[7px] top-1.5 w-2 h-2 rounded-full border border-accent bg-background" />
                                            <div className="text-[10px] font-body text-foreground">{ev.title}</div>
                                            <div className="text-[8px] font-mono text-muted-foreground">{new Date(ev.event_timestamp).toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
