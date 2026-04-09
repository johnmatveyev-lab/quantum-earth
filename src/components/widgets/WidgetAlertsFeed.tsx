import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function WidgetAlertsFeed() {
    const { user } = useAuthContext();
    const [alerts, setAlerts] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;
        supabase
            .from('alerts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)
            .then(({ data }) => setAlerts(data || []));
    }, [user]);

    return (
        <div className="h-full flex flex-col">
            <div className="font-mono text-[8px] text-muted-foreground tracking-wider px-2 py-1.5 border-b border-border flex items-center gap-1">
                <Bell size={8} /> ALERTS FEED
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {alerts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[9px] text-muted-foreground font-mono">No alerts</div>
                ) : alerts.map(a => (
                    <div key={a.id} className="px-2 py-1.5 border-b border-border/30">
                        <div className="font-mono text-[9px] text-foreground">{a.title}</div>
                        <div className="font-mono text-[7px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
