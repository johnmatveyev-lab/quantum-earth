import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, ArrowLeft, Plus, Trash2, Send, Check, X, Webhook, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Channel {
    id: string;
    name: string;
    channel_type: string;
    webhook_url?: string;
    email?: string;
    active: boolean;
}

interface Rule {
    id: string;
    channel_id: string;
    event_type: string;
    active: boolean;
}

const EVENT_TYPES = [
    { key: 'geofence_enter', label: 'Geofence Enter' },
    { key: 'geofence_exit', label: 'Geofence Exit' },
    { key: 'anomaly_high', label: 'High Severity Anomaly' },
    { key: 'anomaly_medium', label: 'Medium Severity Anomaly' },
    { key: 'daily_briefing', label: 'Daily Briefing' },
    { key: 'watchlist_change', label: 'Watchlist Change' },
];

const CHANNEL_TYPES = [
    { key: 'discord', label: 'Discord', icon: '🎮' },
    { key: 'slack', label: 'Slack', icon: '💬' },
    { key: 'webhook', label: 'Webhook', icon: '🔗' },
    { key: 'email', label: 'Email', icon: '📧' },
];

export default function Notifications() {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('discord');
    const [newUrl, setNewUrl] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [testing, setTesting] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        loadData();
    }, [user]);

    async function loadData() {
        const [{ data: ch }, { data: ru }] = await Promise.all([
            (supabase as any).from('notification_channels').select('*').eq('user_id', user!.id).order('created_at'),
            (supabase as any).from('notification_rules').select('*').eq('user_id', user!.id),
        ]);
        setChannels(ch || []);
        setRules(ru || []);
        setLoading(false);
    }

    async function createChannel() {
        if (!newName.trim() || !user) return;
        const insert: any = {
            user_id: user.id,
            name: newName.trim(),
            channel_type: newType,
        };
        if (newType === 'email') insert.email = newEmail;
        else insert.webhook_url = newUrl;

        const { error } = await (supabase as any).from('notification_channels').insert(insert);
        if (error) { toast.error(error.message); return; }
        setCreating(false);
        setNewName(''); setNewUrl(''); setNewEmail('');
        loadData();
        toast.success('Channel created');
    }

    async function deleteChannel(id: string) {
        await (supabase as any).from('notification_channels').delete().eq('id', id);
        loadData();
        toast.success('Channel deleted');
    }

    async function toggleRule(channelId: string, eventType: string) {
        const existing = rules.find(r => r.channel_id === channelId && r.event_type === eventType);
        if (existing) {
            await (supabase as any).from('notification_rules').delete().eq('id', existing.id);
        } else {
            await (supabase as any).from('notification_rules').insert({
                user_id: user!.id,
                channel_id: channelId,
                event_type: eventType,
            });
        }
        loadData();
    }

    async function testChannel(channelId: string) {
        setTesting(channelId);
        try {
            await supabase.functions.invoke('send-notification', {
                body: {
                    user_id: user!.id,
                    alert_type: 'anomaly_high',
                    title: 'Test Notification',
                    description: 'This is a test from Orbital Command',
                },
            });
            toast.success('Test sent');
        } catch (e: any) {
            toast.error(`Test failed: ${e.message}`);
        }
        setTesting(null);
    }

    const isRuleActive = (channelId: string, eventType: string) =>
        rules.some(r => r.channel_id === channelId && r.event_type === eventType && r.active);

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-3xl mx-auto">
                <button onClick={() => navigate('/app')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-body text-sm mb-8 transition-colors">
                    <ArrowLeft size={16} /> Back to Mission Control
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <Bell size={20} className="text-accent" />
                    <h1 className="font-display text-lg tracking-[0.3em] text-accent glow-text">NOTIFICATIONS</h1>
                </div>

                {/* Create channel */}
                <div className="glass-panel hud-border rounded-xl p-4 mb-6">
                    {creating ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Channel name..."
                                    className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
                                />
                                <select
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value)}
                                    className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:border-accent/50"
                                >
                                    {CHANNEL_TYPES.map(t => (
                                        <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
                                    ))}
                                </select>
                            </div>
                            {newType === 'email' ? (
                                <input
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="Email address..."
                                    type="email"
                                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
                                />
                            ) : (
                                <input
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                    placeholder="Webhook URL..."
                                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
                                />
                            )}
                            <div className="flex gap-2">
                                <button onClick={createChannel} className="px-4 py-2 rounded-lg bg-accent/20 border border-accent/40 text-accent font-display text-[9px] tracking-[0.2em] hover:bg-accent/30">CREATE</button>
                                <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg text-muted-foreground text-[9px] font-mono hover:text-foreground">CANCEL</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setCreating(true)}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-accent hover:border-accent/30 transition-all text-sm font-body"
                        >
                            <Plus size={14} /> Add Notification Channel
                        </button>
                    )}
                </div>

                {/* Channel list with rule matrix */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => (
                            <div key={i} className="glass-panel hud-border rounded-xl p-4 animate-pulse"><div className="h-4 bg-muted/30 rounded w-1/3" /></div>
                        ))}
                    </div>
                ) : channels.length === 0 ? (
                    <div className="glass-panel hud-border rounded-xl p-8 text-center">
                        <Bell size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
                        <p className="font-body text-sm text-muted-foreground">No notification channels configured</p>
                        <p className="font-mono text-[9px] text-muted-foreground mt-1">Add a Discord, Slack, or webhook channel above</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {channels.map((ch, i) => (
                            <motion.div
                                key={ch.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="glass-panel hud-border rounded-xl overflow-hidden"
                            >
                                {/* Channel header */}
                                <div className="flex items-center gap-3 p-3 border-b border-border">
                                    <span className="text-lg">{CHANNEL_TYPES.find(t => t.key === ch.channel_type)?.icon || '🔔'}</span>
                                    <div className="flex-1">
                                        <p className="font-body text-sm text-foreground">{ch.name}</p>
                                        <p className="font-mono text-[8px] text-muted-foreground">{ch.channel_type} · {ch.webhook_url ? ch.webhook_url.substring(0, 40) + '...' : ch.email}</p>
                                    </div>
                                    <button onClick={() => testChannel(ch.id)} className="px-2 py-1 rounded text-[8px] font-mono text-accent hover:bg-accent/10 transition-colors" disabled={testing === ch.id}>
                                        {testing === ch.id ? '...' : '⚡ TEST'}
                                    </button>
                                    <button onClick={() => deleteChannel(ch.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                                        <Trash2 size={12} />
                                    </button>
                                </div>

                                {/* Rule toggles */}
                                <div className="p-3 grid grid-cols-3 gap-1.5">
                                    {EVENT_TYPES.map(et => (
                                        <button
                                            key={et.key}
                                            onClick={() => toggleRule(ch.id, et.key)}
                                            className={`px-2 py-1.5 rounded-md text-[8px] font-mono tracking-wider transition-all ${isRuleActive(ch.id, et.key)
                                                    ? 'bg-accent/15 text-accent border border-accent/30'
                                                    : 'text-muted-foreground hover:text-foreground border border-transparent hover:border-border'
                                                }`}
                                        >
                                            {isRuleActive(ch.id, et.key) ? <Check size={8} className="inline mr-1" /> : null}
                                            {et.label}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
