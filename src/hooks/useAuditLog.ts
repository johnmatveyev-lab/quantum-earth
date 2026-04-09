import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useAuditLog() {
    const { user } = useAuthContext();

    const log = useCallback(async (
        action: string,
        resourceType?: string,
        resourceId?: string,
        metadata?: Record<string, any>,
        orgId?: string,
    ) => {
        if (!user) return;
        try {
            await (supabase as any).from('audit_logs').insert({
                user_id: user.id,
                org_id: orgId || null,
                action,
                resource_type: resourceType,
                resource_id: resourceId,
                metadata: metadata || {},
            });
        } catch (e) {
            console.error('Audit log failed:', e);
        }
    }, [user]);

    return { log };
}
