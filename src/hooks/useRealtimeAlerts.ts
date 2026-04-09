import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const CHIME_FREQUENCY = 880; // Hz — A5 note
const CHIME_DURATION = 150; // ms

function playChime() {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.value = CHIME_FREQUENCY;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + CHIME_DURATION / 1000);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + CHIME_DURATION / 1000);

        // Cleanup
        setTimeout(() => ctx.close(), CHIME_DURATION + 100);
    } catch {
        // AudioContext may not be available
    }
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
}

function showBrowserNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: 'orbital-command-alert',
        });
    }
}

export function useRealtimeAlerts() {
    const { user } = useAuthContext();
    const permissionRequested = useRef(false);

    // Request notification permission once
    useEffect(() => {
        if (!permissionRequested.current) {
            permissionRequested.current = true;
            requestNotificationPermission();
        }
    }, []);

    // Subscribe to realtime alerts
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('realtime-alerts')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'alerts',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const alert = payload.new as { title: string; description: string; alert_type: string };

                    // In-app toast
                    toast(alert.title, {
                        description: alert.description || undefined,
                        duration: 6000,
                    });

                    // Audio chime
                    playChime();

                    // Browser push notification
                    showBrowserNotification(
                        `🛰️ ${alert.title}`,
                        alert.description || 'New alert from Orbital Command'
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);
}
