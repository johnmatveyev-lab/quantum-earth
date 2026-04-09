import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plane, Satellite, Mail } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });
      if (error) throw error;
      toast.success('Magic link sent! Check your email to login.');
      setEmail('');
    } catch (err: any) {
      setFormError(err.message || 'Authentication failed');
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 hud-grid opacity-30" />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 50%, hsla(195, 100%, 50%, 0.05) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, hsla(260, 70%, 60%, 0.05) 0%, transparent 50%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="relative">
              <Satellite className="text-primary w-8 h-8" />
              <Plane className="text-accent w-4 h-4 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <h1 className="font-display text-2xl tracking-[0.4em] text-primary glow-text">SKYWATCH</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-[0.3em] mt-1">
            AEROSPACE INTELLIGENCE PLATFORM
          </p>
        </div>

        {/* Auth card */}
        <div className="glass-panel hud-border rounded-xl p-6">
          <h2 className="font-display text-[11px] tracking-[0.25em] text-foreground mb-4 text-center">
            MISSION ACCESS
          </h2>
          <p className="font-body text-xs text-muted-foreground mb-6 text-center">
            Enter your secure email. We'll send a magic uplink token to sign you in.
          </p>

          {formError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 text-destructive">
              <div className="font-mono text-xs mt-0.5">⚠</div>
              <p className="font-body text-xs">{formError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-muted/30 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary/20 border border-primary/40 text-primary font-display text-[10px] tracking-[0.3em] hover:bg-primary/30 transition-all disabled:opacity-50"
            >
              {loading ? 'TRANSMITTING...' : 'SEND MAGIC LINK'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
