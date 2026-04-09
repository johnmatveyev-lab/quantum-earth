import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Layout, Plus, ArrowLeft, Trash2, Star, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Dashboard {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  layout: any[];
}

export default function Dashboards() {
  const { user, profile } = useAuthContext();
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  const isPro = profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'enterprise';

  useEffect(() => {
    if (!user) return;
    supabase
      .from('saved_dashboards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setDashboards((data as unknown as Dashboard[]) || []);
        setLoading(false);
      });
  }, [user]);

  async function createDashboard() {
    if (!newName.trim() || !user) return;
    if (!isPro) {
      toast.error('Upgrade to Pro to create custom dashboards');
      return;
    }
    const { data, error } = await supabase
      .from('saved_dashboards')
      .insert({ user_id: user.id, name: newName.trim(), layout: [], is_default: dashboards.length === 0 })
      .select()
      .single();
    if (error) {
      toast.error('Failed to create dashboard');
      return;
    }
    setDashboards([data as unknown as Dashboard, ...dashboards]);
    setNewName('');
    toast.success('Dashboard created');
  }

  async function deleteDashboard(id: string) {
    await supabase.from('saved_dashboards').delete().eq('id', id);
    setDashboards((d) => d.filter((db) => db.id !== id));
    toast.success('Dashboard deleted');
  }

  async function setDefault(id: string) {
    if (!user) return;
    // Clear other defaults
    await supabase.from('saved_dashboards').update({ is_default: false }).eq('user_id', user.id);
    await supabase.from('saved_dashboards').update({ is_default: true }).eq('id', id);
    setDashboards((d) => d.map((db) => ({ ...db, is_default: db.id === id })));
    toast.success('Default dashboard set');
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-body text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Mission Control
        </button>

        <div className="flex items-center gap-3 mb-6">
          <Layout size={20} className="text-primary" />
          <h1 className="font-display text-lg tracking-[0.3em] text-primary glow-text">DASHBOARDS</h1>
        </div>

        {/* Create new */}
        <div className="glass-panel hud-border rounded-xl p-4 mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New dashboard name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createDashboard()}
              className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
            />
            <button onClick={createDashboard} className="px-4 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary font-display text-[9px] tracking-[0.2em] hover:bg-primary/30 transition-all flex items-center gap-1.5">
              <Plus size={12} /> CREATE
            </button>
          </div>
          {!isPro && (
            <p className="font-mono text-[9px] text-glow-warning mt-2">⚠ Pro tier required for custom dashboards</p>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-panel hud-border rounded-xl p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-muted/30 rounded w-1/3" />
                  <div className="h-3 bg-muted/20 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : dashboards.length === 0 ? (
          <div className="glass-panel hud-border rounded-xl p-12 text-center mt-8">
            <Layout size={32} className="text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-display tracking-widest text-lg text-foreground mb-2">NO CUSTOM LAYOUTS</h3>
            <p className="font-body text-sm text-muted-foreground max-w-sm mx-auto">Create a new dashboard above to build your own specialized intelligence monitoring view.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dashboards.map((db, i) => (
              <motion.div
                key={db.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-panel rounded-lg p-3 flex items-center gap-3"
              >
                <Layout size={14} className="text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-body text-sm text-foreground">{db.name}</p>
                  <p className="font-mono text-[8px] text-muted-foreground">{new Date(db.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => navigate(`/dashboards/${db.id}/edit`)} className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors" title="Edit layout">
                  <Edit2 size={12} />
                </button>
                <button onClick={() => setDefault(db.id)} className={`p-1.5 rounded transition-colors ${db.is_default ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Star size={12} fill={db.is_default ? 'currentColor' : 'none'} />
                </button>
                <button onClick={() => deleteDashboard(db.id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 size={12} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
