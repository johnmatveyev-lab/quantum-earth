import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, ArrowLeft, Plus, Trash2, Copy, Check, BarChart3, Code, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    permissions: string[];
    rate_limit: number;
    active: boolean;
    last_used_at: string | null;
    created_at: string;
    usage_today?: number;
}

async function hashKey(key: string): Promise<string> {
    const data = new TextEncoder().encode(key);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'api_live_';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export default function Developer() {
    const { user, profile } = useAuthContext();
    const navigate = useNavigate();
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'keys' | 'docs'>('keys');

    const isPro = profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'enterprise';

    useEffect(() => {
        if (!user) return;
        loadKeys();
    }, [user]);

    async function loadKeys() {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await (supabase as any).from('api_keys')
            .select('*, api_usage_logs(request_count)')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false });

        if (data) {
            setKeys(data.map((k: any) => ({
                ...k,
                usage_today: k.api_usage_logs?.find((u: any) => u.usage_date === today)?.request_count || 0,
            })));
        }
        setLoading(false);
    }

    async function createKey() {
        if (!newKeyName.trim() || !user) return;
        if (!isPro) {
            toast.error('API access requires Pro or Enterprise tier');
            return;
        }

        const rawKey = generateApiKey();
        const keyHash = await hashKey(rawKey);
        const prefix = rawKey.substring(0, 12) + '...';

        const rateLimit = profile?.subscription_tier === 'enterprise' ? 999999 : 50000;

        const { error } = await (supabase as any).from('api_keys').insert({
            user_id: user.id,
            name: newKeyName.trim(),
            prefix,
            key_hash: keyHash,
            permissions: ['read'],
            rate_limit: rateLimit,
        });

        if (error) {
            toast.error('Failed to create key');
            return;
        }

        setCreatedKey(rawKey);
        setNewKeyName('');
        loadKeys();
        toast.success('API key created');
    }

    async function deleteKey(id: string) {
        await (supabase as any).from('api_keys').delete().eq('id', id);
        setKeys(k => k.filter(x => x.id !== id));
        toast.success('Key deleted');
    }

    async function toggleKey(id: string, active: boolean) {
        await (supabase as any).from('api_keys').update({ active: !active }).eq('id', id);
        setKeys(k => k.map(x => x.id === id ? { ...x, active: !active } : x));
    }

    function copyToClipboard(text: string, id: string) {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apiBase = `${supabaseUrl}/functions/v1/api-public`;

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-3xl mx-auto">
                <button onClick={() => navigate('/app')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-body text-sm mb-8 transition-colors">
                    <ArrowLeft size={16} /> Back to Mission Control
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <Key size={20} className="text-primary" />
                    <h1 className="font-display text-lg tracking-[0.3em] text-primary glow-text">DEVELOPER API</h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6">
                    {[
                        { key: 'keys' as const, label: 'API KEYS', icon: <Key size={12} /> },
                        { key: 'docs' as const, label: 'QUICK START', icon: <Code size={12} /> },
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

                {activeTab === 'keys' ? (
                    <>
                        {/* Notice for unauthenticated key display */}
                        {createdKey && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-panel rounded-xl p-4 mb-6 border border-accent/30"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Key size={14} className="text-accent" />
                                    <span className="font-display text-[10px] tracking-wider text-accent">KEY CREATED — COPY NOW</span>
                                </div>
                                <p className="font-mono text-[9px] text-glow-warning mb-2">This is the only time you'll see the full key!</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-muted/30 border border-border rounded px-3 py-2 text-xs font-mono text-foreground break-all">{createdKey}</code>
                                    <button
                                        onClick={() => copyToClipboard(createdKey, 'new')}
                                        className="px-3 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                                    >
                                        {copiedId === 'new' ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                                <button onClick={() => setCreatedKey(null)} className="mt-2 text-[9px] font-mono text-muted-foreground hover:text-foreground">Dismiss</button>
                            </motion.div>
                        )}

                        {/* Create */}
                        <div className="glass-panel hud-border rounded-xl p-4 mb-6">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Key name (e.g. Production App)"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && createKey()}
                                    className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                                />
                                <button onClick={createKey} className="px-4 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary font-display text-[9px] tracking-[0.2em] hover:bg-primary/30 transition-all flex items-center gap-1.5">
                                    <Plus size={12} /> GENERATE
                                </button>
                            </div>
                            {!isPro && (
                                <p className="font-mono text-[9px] text-glow-warning mt-2">⚠ API access requires Pro or Enterprise tier</p>
                            )}
                        </div>

                        {/* Key list */}
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2].map(i => (
                                    <div key={i} className="glass-panel hud-border rounded-xl p-4 animate-pulse">
                                        <div className="h-4 bg-muted/30 rounded w-1/3" />
                                    </div>
                                ))}
                            </div>
                        ) : keys.length === 0 ? (
                            <div className="glass-panel hud-border rounded-xl p-12 text-center mt-8">
                                <Key size={32} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                                <h3 className="font-display tracking-widest text-lg text-foreground mb-2">NO ACTIVE KEYS</h3>
                                <p className="font-body text-sm text-muted-foreground max-w-sm mx-auto">Generate a new API key above to initiate programmatic access to the Orbital Command network.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {keys.map((k, i) => (
                                    <motion.div
                                        key={k.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="glass-panel rounded-xl p-4"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${k.active ? 'bg-accent animate-pulse' : 'bg-muted-foreground'}`} />
                                                <span className="font-body text-sm text-foreground">{k.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => toggleKey(k.id, k.active)} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors" title={k.active ? 'Disable' : 'Enable'}>
                                                    {k.active ? <Eye size={12} /> : <EyeOff size={12} />}
                                                </button>
                                                <button onClick={() => deleteKey(k.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 font-mono text-[9px] text-muted-foreground">
                                            <span>🔑 {k.prefix}</span>
                                            <span>·</span>
                                            <span className="flex items-center gap-1"><BarChart3 size={9} /> {k.usage_today || 0}/{k.rate_limit.toLocaleString()}/day</span>
                                            <span>·</span>
                                            <span>{k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}` : 'Never used'}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    /* Docs tab */
                    <div className="glass-panel hud-border rounded-xl p-6 space-y-6">
                        <div>
                            <h2 className="font-display text-[11px] tracking-wider text-primary mb-3">AUTHENTICATION</h2>
                            <p className="font-body text-xs text-muted-foreground mb-2">Include your API key in the Authorization header:</p>
                            <CodeBlock language="bash" code={`curl -H "Authorization: Bearer api_live_YOUR_KEY" \\\n  ${apiBase}/v1/aircraft`} onCopy={() => copyToClipboard(`curl -H "Authorization: Bearer api_live_YOUR_KEY" ${apiBase}/v1/aircraft`, 'curl')} copied={copiedId === 'curl'} />
                        </div>

                        <div>
                            <h2 className="font-display text-[11px] tracking-wider text-primary mb-3">ENDPOINTS</h2>
                            <div className="space-y-2">
                                {[
                                    { method: 'GET', path: '/v1/aircraft', desc: 'Live aircraft positions' },
                                    { method: 'GET', path: '/v1/satellites', desc: 'Live satellite positions' },
                                    { method: 'GET', path: '/v1/objects/:id', desc: 'Single object detail' },
                                    { method: 'GET', path: '/v1/history?object_id=...&from=...&to=...', desc: 'Historical positions' },
                                    { method: 'GET', path: '/v1/watchlists', desc: 'Your watchlists + items' },
                                    { method: 'GET', path: '/v1/alerts', desc: 'Your alert feed' },
                                ].map(ep => (
                                    <div key={ep.path} className="flex items-center gap-3 p-2 rounded-lg bg-muted/10">
                                        <span className="font-mono text-[9px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">{ep.method}</span>
                                        <span className="font-mono text-[10px] text-foreground flex-1">{ep.path}</span>
                                        <span className="font-mono text-[8px] text-muted-foreground">{ep.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h2 className="font-display text-[11px] tracking-wider text-primary mb-3">PYTHON EXAMPLE</h2>
                            <CodeBlock language="python" code={`import requests\n\nAPI_KEY = "api_live_YOUR_KEY"\nBASE = "${apiBase}"\n\n# Get live aircraft\nres = requests.get(f"{BASE}/v1/aircraft", headers={\n    "Authorization": f"Bearer {API_KEY}"\n})\naircraft = res.json()["data"]\nprint(f"Tracking {len(aircraft)} aircraft")`} onCopy={() => copyToClipboard('python', 'py')} copied={copiedId === 'py'} />
                        </div>

                        <div>
                            <h2 className="font-display text-[11px] tracking-wider text-primary mb-3">JAVASCRIPT EXAMPLE</h2>
                            <CodeBlock language="javascript" code={`const API_KEY = "api_live_YOUR_KEY";\nconst BASE = "${apiBase}";\n\nconst res = await fetch(\`\${BASE}/v1/satellites\`, {\n  headers: { Authorization: \`Bearer \${API_KEY}\` }\n});\nconst { data } = await res.json();\nconsole.log(\`Tracking \${data.length} satellites\`);`} onCopy={() => copyToClipboard('js', 'js')} copied={copiedId === 'js'} />
                        </div>

                        <div>
                            <h2 className="font-display text-[11px] tracking-wider text-primary mb-3">RATE LIMITS</h2>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { tier: 'Free', limit: 'No API access' },
                                    { tier: 'Pro', limit: '50,000 req/day' },
                                    { tier: 'Enterprise', limit: 'Unlimited' },
                                ].map(t => (
                                    <div key={t.tier} className="p-3 rounded-lg bg-muted/10 border border-border text-center">
                                        <div className="font-display text-[9px] tracking-wider text-muted-foreground">{t.tier}</div>
                                        <div className="font-mono text-[10px] text-foreground mt-1">{t.limit}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function CodeBlock({ language, code, onCopy, copied }: { language: string; code: string; onCopy: () => void; copied: boolean }) {
    return (
        <div className="relative rounded-lg bg-[#0d1117] border border-border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
                <span className="font-mono text-[8px] text-muted-foreground">{language}</span>
                <button onClick={onCopy} className="text-muted-foreground hover:text-foreground transition-colors">
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                </button>
            </div>
            <pre className="p-3 overflow-x-auto"><code className="font-mono text-[10px] text-foreground leading-relaxed whitespace-pre">{code}</code></pre>
        </div>
    );
}
