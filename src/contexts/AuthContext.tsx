import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  notification_preferences: { email_alerts: boolean; in_app: boolean };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  activeOrg: Org | null;
  orgRole: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refetchProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as Profile);

    const { data: orgData } = await supabase
      .from('org_members')
      .select('role, organizations(*)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (orgData && orgData.organizations) {
      setActiveOrg(orgData.organizations as Org);
      setOrgRole(orgData.role);
    } else {
      setActiveOrg(null);
      setOrgRole(null);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          if (event === 'SIGNED_IN') {
            // Log login event directly since hook isn't available here
            supabase.from('audit_logs').insert({
              user_id: session.user.id,
              action: 'login',
              metadata: { method: session.user.app_metadata.provider }
            }).then();
          }
          // Defer profile fetch to avoid deadlock with Supabase triggers
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setActiveOrg(null);
          setOrgRole(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setActiveOrg(null);
    setOrgRole(null);
  }, []);

  const refetchProfile = useCallback(() => {
    if (user) fetchProfile(user.id);
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, session, profile, activeOrg, orgRole, loading, signOut, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
