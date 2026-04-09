import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, ArrowLeft, Plus, Trash2, UserPlus, Shield, Eye, Edit3, Crown, Users, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuditLog } from '@/components/ui/AuditLog';
import { useAuditLog } from '@/hooks/useAuditLog';

interface Org {
    id: string;
    name: string;
    slug: string;
    plan: string;
    created_at: string;
}

interface Member {
    id: string;
    user_id: string;
    role: string;
    joined_at: string;
    profiles?: { display_name?: string; email?: string };
}

interface Invite {
    id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
    admin: <Crown size={10} className="text-glow-warning" />,
    analyst: <Edit3 size={10} className="text-accent" />,
    viewer: <Eye size={10} className="text-muted-foreground" />,
};

export default function Organization() {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const { log } = useAuditLog();
    const [activeTab, setActiveTab] = useState<'team' | 'audit'>('team');
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [activeOrg, setActiveOrg] = useState<Org | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [auditEntries, setAuditEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [auditLoading, setAuditLoading] = useState(false);
    // Create form
    const [creating, setCreating] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    // Invite form
    const [inviting, setInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('viewer');

    useEffect(() => {
        if (!user) return;
        loadOrgs();
    }, [user]);

    async function loadOrgs() {
        const { data: memberships } = await (supabase as any)
            .from('org_members')
            .select('org_id, role, organizations(*)')
            .eq('user_id', user!.id);

        if (memberships && memberships.length > 0) {
            const orgList = memberships.map((m: any) => m.organizations).filter(Boolean);
            setOrgs(orgList);
            if (!activeOrg && orgList.length > 0) {
                setActiveOrg(orgList[0]);
                loadMembers(orgList[0].id);
            }
        }
        setLoading(false);
    }

    async function loadMembers(orgId: string) {
        const { data } = await (supabase as any)
            .from('org_members')
            .select('*, profiles:user_id(display_name, email)')
            .eq('org_id', orgId)
            .order('joined_at');
        setMembers(data || []);

        const { data: inv } = await (supabase as any)
            .from('org_invites')
            .select('*')
            .eq('org_id', orgId)
            .eq('status', 'pending');
        setInvites(inv || []);
    }

    async function loadAudit() {
        if (!activeOrg) return;
        setAuditLoading(true);
        const { data } = await (supabase as any)
            .from('audit_logs')
            .select('*, profiles:user_id(display_name, email)')
            .eq('org_id', activeOrg.id)
            .order('created_at', { ascending: false })
            .limit(100);
        setAuditEntries(data || []);
        setAuditLoading(false);
    }

    async function createOrg() {
        if (!newOrgName.trim() || !user) return;
        const slug = newOrgName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const { data, error } = await (supabase as any)
            .from('organizations')
            .insert({ name: newOrgName.trim(), slug, created_by: user.id })
            .select()
            .single();
        if (error) { toast.error(error.message); return; }

        // Add creator as admin
        await (supabase as any).from('org_members').insert({
            org_id: data.id, user_id: user.id, role: 'admin', invited_by: user.id,
        });

        await log('create_organization', 'organization', data.id, { name: data.name }, data.id);
        setCreating(false);
        setNewOrgName('');
        setActiveOrg(data);
        loadOrgs();
        loadMembers(data.id);
        toast.success('Organization created');
    }

    async function sendInvite() {
        if (!inviteEmail.trim() || !activeOrg || !user) return;

        const { error } = await (supabase as any).from('org_invites').insert({
            org_id: activeOrg.id, email: inviteEmail.trim(), role: inviteRole, invited_by: user.id,
        });
        if (error) { toast.error(error.message); return; }

        await log('invite_member', 'org_invite', undefined, { email: inviteEmail, role: inviteRole }, activeOrg.id);
        setInviting(false);
        setInviteEmail('');
        loadMembers(activeOrg.id);
        toast.success(`Invite sent to ${inviteEmail}`);
    }

    async function removeMember(memberId: string) {
        await (supabase as any).from('org_members').delete().eq('id', memberId);
        await log('remove_member', 'org_member', memberId, {}, activeOrg?.id);
        loadMembers(activeOrg!.id);
        toast.success('Member removed');
    }

    async function changeRole(memberId: string, newRole: string) {
        await (supabase as any).from('org_members').update({ role: newRole }).eq('id', memberId);
        await log('change_role', 'org_member', memberId, { new_role: newRole }, activeOrg?.id);
        loadMembers(activeOrg!.id);
        toast.success('Role updated');
    }

    const userRole = members.find(m => m.user_id === user?.id)?.role;
    const isAdmin = userRole === 'admin';

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-3xl mx-auto">
                <button onClick={() => navigate('/app')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-body text-sm mb-8 transition-colors">
                    <ArrowLeft size={16} /> Back to Mission Control
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <Building2 size={20} className="text-secondary" />
                    <h1 className="font-display text-lg tracking-[0.3em] text-secondary glow-text">ORGANIZATION</h1>
                </div>

                {/* Org selector or create */}
                {!activeOrg && !creating && (
                    <div className="glass-panel hud-border rounded-xl p-8 text-center mb-6">
                        <Building2 size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
                        <p className="font-body text-sm text-muted-foreground mb-4">No organization yet</p>
                        <button onClick={() => setCreating(true)} className="px-6 py-2 rounded-lg bg-secondary/20 border border-secondary/40 text-secondary font-display text-[10px] tracking-[0.2em] hover:bg-secondary/30 transition-all">
                            <Plus size={12} className="inline mr-1" /> CREATE ORGANIZATION
                        </button>
                    </div>
                )}

                {creating && (
                    <div className="glass-panel hud-border rounded-xl p-4 mb-6">
                        <div className="flex gap-2">
                            <input
                                value={newOrgName}
                                onChange={(e) => setNewOrgName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && createOrg()}
                                placeholder="Organization name..."
                                className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary/50"
                            />
                            <button onClick={createOrg} className="px-4 py-2 rounded-lg bg-secondary/20 border border-secondary/40 text-secondary font-display text-[9px] tracking-[0.2em]">CREATE</button>
                            <button onClick={() => setCreating(false)} className="px-3 py-2 text-[9px] font-mono text-muted-foreground">CANCEL</button>
                        </div>
                    </div>
                )}

                {activeOrg && (
                    <>
                        {/* Org header */}
                        <div className="glass-panel hud-border rounded-xl p-4 mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-secondary/20 border border-secondary/30 flex items-center justify-center font-display text-secondary text-sm">
                                {activeOrg.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <p className="font-body text-sm text-foreground">{activeOrg.name}</p>
                                <p className="font-mono text-[8px] text-muted-foreground">{activeOrg.slug} · {members.length} members · {activeOrg.plan}</p>
                            </div>
                            {orgs.length > 1 && (
                                <select
                                    value={activeOrg.id}
                                    onChange={(e) => {
                                        const org = orgs.find(o => o.id === e.target.value);
                                        if (org) { setActiveOrg(org); loadMembers(org.id); }
                                    }}
                                    className="bg-muted/30 border border-border rounded px-2 py-1 text-[9px] font-mono text-foreground"
                                >
                                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 mb-6">
                            {[
                                { key: 'team' as const, label: 'TEAM', icon: <Users size={12} /> },
                                { key: 'audit' as const, label: 'AUDIT LOG', icon: <FileText size={12} /> },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => { setActiveTab(tab.key); if (tab.key === 'audit') loadAudit(); }}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-mono tracking-wider transition-all ${activeTab === tab.key
                                            ? 'bg-secondary/15 text-secondary border border-secondary/30'
                                            : 'text-muted-foreground hover:text-foreground border border-transparent'
                                        }`}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'team' ? (
                            <>
                                {/* Invite */}
                                {isAdmin && (
                                    <div className="glass-panel hud-border rounded-xl p-4 mb-4">
                                        {inviting ? (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        value={inviteEmail}
                                                        onChange={(e) => setInviteEmail(e.target.value)}
                                                        placeholder="Email address..."
                                                        type="email"
                                                        className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none"
                                                    />
                                                    <select
                                                        value={inviteRole}
                                                        onChange={(e) => setInviteRole(e.target.value)}
                                                        className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs font-body text-foreground"
                                                    >
                                                        <option value="viewer">Viewer</option>
                                                        <option value="analyst">Analyst</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={sendInvite} className="px-4 py-1.5 rounded-lg bg-accent/20 border border-accent/40 text-accent font-display text-[9px] tracking-[0.2em]">SEND INVITE</button>
                                                    <button onClick={() => setInviting(false)} className="text-[9px] font-mono text-muted-foreground">CANCEL</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => setInviting(true)} className="w-full flex items-center justify-center gap-2 py-2 text-sm font-body text-muted-foreground hover:text-accent border border-dashed border-border hover:border-accent/30 rounded-lg transition-all">
                                                <UserPlus size={14} /> Invite Team Member
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Members list */}
                                <div className="space-y-2">
                                    {members.map((m, i) => (
                                        <motion.div
                                            key={m.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="glass-panel rounded-lg p-3 flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-muted/30 border border-border flex items-center justify-center font-mono text-[10px] text-foreground">
                                                {(m.profiles?.display_name || m.profiles?.email || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-body text-sm text-foreground">{m.profiles?.display_name || m.profiles?.email || m.user_id.substring(0, 8)}</p>
                                                <p className="font-mono text-[8px] text-muted-foreground">Joined {new Date(m.joined_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {ROLE_ICONS[m.role]}
                                                {isAdmin && m.user_id !== user?.id ? (
                                                    <select
                                                        value={m.role}
                                                        onChange={(e) => changeRole(m.id, e.target.value)}
                                                        className="bg-transparent border border-border rounded px-1.5 py-0.5 text-[8px] font-mono text-foreground"
                                                    >
                                                        <option value="viewer">Viewer</option>
                                                        <option value="analyst">Analyst</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                ) : (
                                                    <span className="font-mono text-[9px] text-muted-foreground capitalize">{m.role}</span>
                                                )}
                                            </div>
                                            {isAdmin && m.user_id !== user?.id && (
                                                <button onClick={() => removeMember(m.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Pending invites */}
                                {invites.length > 0 && (
                                    <div className="mt-4">
                                        <div className="font-display text-[9px] tracking-wider text-muted-foreground mb-2">PENDING INVITES</div>
                                        {invites.map(inv => (
                                            <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/10 mb-1">
                                                <UserPlus size={10} className="text-accent" />
                                                <span className="font-mono text-[10px] text-foreground flex-1">{inv.email}</span>
                                                <span className="font-mono text-[8px] text-muted-foreground capitalize">{inv.role}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <AuditLog entries={auditEntries} loading={auditLoading} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
