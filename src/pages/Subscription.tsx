import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Shield, ArrowLeft, CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useEffect } from 'react';

const tiers = [
  {
    id: 'free' as const,
    name: 'FREE',
    price: '$0',
    period: '/month',
    color: 'text-muted-foreground',
    borderColor: 'border-border',
    bgGlow: '',
    features: [
      'Global 3D map',
      'Limited aircraft data (50)',
      'Basic satellite view (20)',
      'AI Copilot (5/day)',
      'Community support',
    ],
  },
  {
    id: 'pro' as const,
    name: 'PRO',
    price: '$29',
    period: '/month',
    color: 'text-primary',
    borderColor: 'border-primary/40',
    bgGlow: 'shadow-[0_0_40px_-12px_hsla(195,100%,50%,0.15)]',
    icon: <Zap size={14} />,
    features: [
      'Unlimited aircraft tracking',
      'Full satellite constellations',
      '90-day historical replay',
      'Unlimited AI Copilot',
      '20 watchlists',
      '5 custom dashboards',
      '10 geofence alerts',
      'Maritime AIS data',
      'Daily AI briefings',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'enterprise' as const,
    name: 'ENTERPRISE',
    price: '$199',
    period: '/month',
    color: 'text-accent',
    borderColor: 'border-accent/40',
    bgGlow: 'shadow-[0_0_40px_-12px_hsla(150,100%,50%,0.1)]',
    icon: <Shield size={14} />,
    features: [
      'Everything in Pro',
      'Team workspaces & RBAC',
      'Unlimited API access',
      'Custom data ingestion',
      'Embeddable widgets',
      '1-year historical replay',
      'Advanced analytics',
      'Unlimited dashboards',
      'Unlimited geofence alerts',
      'Dedicated support + SLA',
    ],
  },
];

export default function Subscription() {
  const { user, profile, refetchProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentTier = profile?.subscription_tier || 'free';
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Handle Stripe checkout redirect results
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated! Welcome aboard, Commander.');
      refetchProfile();
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout canceled.');
    }
  }, [searchParams]);

  async function handleUpgrade(tier: 'pro' | 'enterprise') {
    if (!user) {
      toast.error('Please sign in first');
      navigate('/auth');
      return;
    }

    if (tier === currentTier) return;

    setLoading(tier);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error('Session expired. Please sign in again.');
        navigate('/auth');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tier }),
        }
      );

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast.error('Failed to start checkout. Please try again.');
      console.error('Checkout error:', error);
    } finally {
      setLoading(null);
    }
  }

  async function handleManageBilling() {
    if (!user) return;

    setPortalLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error('Session expired. Please sign in again.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-portal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }
      );

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast.error('Failed to open billing portal.');
      console.error('Portal error:', error);
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleDowngradeToFree() {
    if (!user || currentTier === 'free') return;

    // Open billing portal to cancel subscription
    handleManageBilling();
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-body text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Mission Control
        </button>

        <div className="text-center mb-10">
          <h1 className="font-display text-xl tracking-[0.3em] text-primary glow-text">
            SUBSCRIPTION TIERS
          </h1>
          <p className="font-body text-sm text-muted-foreground mt-2">
            Select your mission access level
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass-panel hud-border rounded-xl p-5 relative ${tier.popular ? 'ring-1 ring-primary/30' : ''} ${tier.bgGlow}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary/20 border border-primary/40 rounded-full font-mono text-[7px] text-primary tracking-wider">
                  RECOMMENDED
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                {tier.icon && <span className={tier.color}>{tier.icon}</span>}
                <h3 className={`font-display text-[11px] tracking-[0.25em] ${tier.color}`}>
                  {tier.name}
                </h3>
              </div>

              <div className="mb-4">
                <span className={`font-display text-2xl ${tier.color}`}>{tier.price}</span>
                <span className="font-body text-xs text-muted-foreground">{tier.period}</span>
              </div>

              <ul className="space-y-2 mb-5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[11px] font-body text-foreground">
                    <Check size={12} className={`${tier.color} mt-0.5 flex-shrink-0`} />
                    {f}
                  </li>
                ))}
              </ul>

              {currentTier === tier.id ? (
                <div className="space-y-2">
                  <button
                    disabled
                    className="w-full py-2 rounded-lg font-display text-[9px] tracking-[0.2em] bg-muted/30 text-muted-foreground border border-border cursor-default"
                  >
                    CURRENT PLAN
                  </button>
                  {tier.id !== 'free' && (
                    <button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="w-full py-1.5 rounded-lg font-mono text-[8px] tracking-wider text-muted-foreground hover:text-foreground border border-border/50 hover:border-border transition-all flex items-center justify-center gap-1.5"
                    >
                      {portalLoading ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <CreditCard size={10} />
                      )}
                      MANAGE BILLING
                    </button>
                  )}
                </div>
              ) : tier.id === 'free' ? (
                <button
                  onClick={handleDowngradeToFree}
                  disabled={currentTier === 'free'}
                  className={`w-full py-2 rounded-lg font-display text-[9px] tracking-[0.2em] transition-all ${currentTier === 'free'
                      ? 'bg-muted/30 text-muted-foreground border border-border cursor-default'
                      : 'bg-muted/10 text-muted-foreground border border-border hover:bg-muted/20 hover:text-foreground'
                    }`}
                >
                  {currentTier === 'free' ? 'CURRENT PLAN' : 'DOWNGRADE'}
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(tier.id as 'pro' | 'enterprise')}
                  disabled={loading !== null}
                  className={`w-full py-2 rounded-lg font-display text-[9px] tracking-[0.2em] transition-all bg-primary/10 ${tier.color} border ${tier.borderColor} hover:bg-primary/20 flex items-center justify-center gap-1.5`}
                >
                  {loading === tier.id ? (
                    <>
                      <Loader2 size={10} className="animate-spin" />
                      REDIRECTING...
                    </>
                  ) : (
                    <>
                      <ExternalLink size={10} />
                      {currentTier !== 'free' ? 'SWITCH PLAN' : 'UPGRADE'}
                    </>
                  )}
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Billing info footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="font-mono text-[9px] text-muted-foreground">
            Secure payments via Stripe • Cancel anytime • Instant access on upgrade
          </p>
        </motion.div>
      </div>
    </div>
  );
}
