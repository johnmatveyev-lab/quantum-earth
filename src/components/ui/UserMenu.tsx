import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Crown, Bell, Layout, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const tierColors = {
  free: 'text-muted-foreground',
  pro: 'text-primary',
  enterprise: 'text-accent',
};

const tierLabels = {
  free: 'FREE',
  pro: 'PRO',
  enterprise: 'ENTERPRISE',
};

export function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const tier = profile?.subscription_tier || 'free';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/30 transition-all"
      >
        <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          <User size={10} className="text-primary" />
        </div>
        <span className="font-mono text-[8px] text-foreground tracking-wider hidden md:inline">
          {profile?.full_name || user.email?.split('@')[0] || 'USER'}
        </span>
        <span className={`font-mono text-[7px] tracking-wider ${tierColors[tier]}`}>
          {tierLabels[tier]}
        </span>
        <ChevronDown size={10} className="text-muted-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 z-50 glass-panel hud-border rounded-xl w-56 overflow-hidden"
            >
              <div className="p-3 border-b border-border">
                <p className="font-body text-xs text-foreground truncate">{user.email}</p>
                <p className={`font-mono text-[8px] tracking-wider mt-0.5 ${tierColors[tier]}`}>
                  <Crown size={8} className="inline mr-1" />
                  {tierLabels[tier]} TIER
                </p>
              </div>

              <div className="p-1">
                <MenuItem icon={<Crown size={12} />} label="Subscription" onClick={() => { setOpen(false); navigate('/subscription'); }} />
                <MenuItem icon={<Layout size={12} />} label="My Dashboards" onClick={() => { setOpen(false); navigate('/dashboards'); }} />
                <MenuItem icon={<Bell size={12} />} label="Notifications" onClick={() => { setOpen(false); navigate('/alerts'); }} />
                <div className="h-px bg-border mx-2 my-1" />
                <MenuItem icon={<LogOut size={12} />} label="Sign Out" onClick={() => { setOpen(false); signOut(); }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-body text-foreground hover:bg-muted/30 transition-all"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </button>
  );
}
