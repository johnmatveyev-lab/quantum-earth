import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Filter, ChevronDown } from 'lucide-react';

interface AuditEntry {
    id: string;
    action: string;
    resource_type?: string;
    resource_id?: string;
    metadata: any;
    created_at: string;
    user_id: string;
    profiles?: { display_name?: string; email?: string };
}

interface AuditLogProps {
    entries: AuditEntry[];
    loading: boolean;
}

const ACTION_COLORS: Record<string, string> = {
    create: 'text-accent',
    delete: 'text-destructive',
    update: 'text-glow-warning',
    export: 'text-secondary',
    login: 'text-primary',
    invite: 'text-accent',
};

function getActionColor(action: string): string {
    for (const [key, color] of Object.entries(ACTION_COLORS)) {
        if (action.toLowerCase().includes(key)) return color;
    }
    return 'text-foreground';
}

export function AuditLog({ entries, loading }: AuditLogProps) {
    const [filter, setFilter] = useState('');

    const filtered = filter
        ? entries.filter(e => e.action.toLowerCase().includes(filter.toLowerCase()) || e.resource_type?.toLowerCase().includes(filter.toLowerCase()))
        : entries;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Filter size={12} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Filter actions..."
                        className="w-full bg-muted/30 border border-border rounded-lg pl-8 pr-3 py-2 text-xs font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                </div>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-panel rounded-lg p-3 animate-pulse"><div className="h-3 bg-muted/30 rounded w-2/3" /></div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel rounded-xl p-8 text-center">
                    <FileText size={24} className="text-muted-foreground mx-auto mb-2 opacity-30" />
                    <p className="font-body text-xs text-muted-foreground">No activity recorded</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {filtered.map((entry, i) => (
                        <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/10 transition-colors"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <span className={`font-mono text-[10px] font-semibold ${getActionColor(entry.action)}`}>{entry.action}</span>
                                    {entry.resource_type && (
                                        <span className="font-mono text-[8px] text-muted-foreground">{entry.resource_type}{entry.resource_id ? `:${entry.resource_id.substring(0, 8)}` : ''}</span>
                                    )}
                                </div>
                                <div className="font-mono text-[8px] text-muted-foreground mt-0.5">
                                    {new Date(entry.created_at).toLocaleString()}
                                    {entry.profiles?.display_name && <span> · {entry.profiles.display_name}</span>}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
