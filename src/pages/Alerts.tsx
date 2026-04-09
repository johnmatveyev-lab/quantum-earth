import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, ArrowLeft, Check, Trash2, AlertTriangle, Plane, Satellite, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Alert {
  id: string;
  alert_type: string;
  title: string;
  description: string | null;
  object_id: string | null;
  is_read: boolean;
  created_at: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  aircraft: <Plane size={12} className="text-primary" />,
  satellite: <Satellite size={12} className="text-accent" />,
  rocket: <Rocket size={12} className="text-glow-warning" />,
  anomaly: <AlertTriangle size={12} className="text-destructive" />,
};

export default function Alerts() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAlerts((data as unknown as Alert[]) || []);
        setLoading(false);
      });
  }, [user]);

  async function markRead(id: string) {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    setAlerts((a) => a.map((al) => (al.id === id ? { ...al, is_read: true } : al)));
  }

  async function deleteAlert(id: string) {
    await supabase.from('alerts').delete().eq('id', id);
    setAlerts((a) => a.filter((al) => al.id !== id));
    toast.success('Alert deleted');
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-body text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Mission Control
        </button>

        <div className="flex items-center gap-3 mb-6">
          <Bell size={20} className="text-primary" />
          <h1 className="font-display text-lg tracking-[0.3em] text-primary glow-text">ALERTS</h1>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-panel hud-border rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted/30 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted/30 rounded w-2/3" />
                    <div className="h-2 bg-muted/20 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="glass-panel hud-border rounded-xl p-8 text-center">
            <Bell size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="font-body text-sm text-muted-foreground">No alerts yet</p>
            <p className="font-mono text-[9px] text-muted-foreground mt-1">Track objects to receive notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`glass-panel rounded-lg p-3 flex items-start gap-3 ${!alert.is_read ? 'border-l-2 border-l-primary' : ''}`}
              >
                {typeIcons[alert.alert_type] || typeIcons.anomaly}
                <div className="flex-1 min-w-0">
                  <p className={`font-body text-xs ${alert.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>{alert.title}</p>
                  {alert.description && <p className="font-mono text-[9px] text-muted-foreground mt-0.5">{alert.description}</p>}
                  <p className="font-mono text-[8px] text-muted-foreground mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-1">
                  {!alert.is_read && (
                    <button onClick={() => markRead(alert.id)} className="p-1 hover:bg-muted/30 rounded transition-colors">
                      <Check size={12} className="text-accent" />
                    </button>
                  )}
                  <button onClick={() => deleteAlert(alert.id)} className="p-1 hover:bg-muted/30 rounded transition-colors">
                    <Trash2 size={12} className="text-muted-foreground" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
