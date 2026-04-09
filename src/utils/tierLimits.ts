/**
 * Tier enforcement utilities for Orbital Command.
 *
 * Defines the limits for each subscription tier and provides
 * helper functions for feature gating and limit checks.
 */

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface TierLimits {
    maxAircraft: number;
    maxSatellites: number;
    maxWatchlists: number;
    maxDashboards: number;
    maxGeofenceAlerts: number;
    maxAICopilotDaily: number;
    historyDays: number;
    hasMaritimeAIS: boolean;
    hasAPIAccess: boolean;
    hasTeamWorkspace: boolean;
    hasCustomDataIngestion: boolean;
    hasEmbeddableWidgets: boolean;
    hasDailyBriefings: boolean;
    hasTimelineReplay: boolean;
}

const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
    free: {
        maxAircraft: 50,
        maxSatellites: 20,
        maxWatchlists: 1,
        maxDashboards: 0,
        maxGeofenceAlerts: 0,
        maxAICopilotDaily: 5,
        historyDays: 0,
        hasMaritimeAIS: false,
        hasAPIAccess: false,
        hasTeamWorkspace: false,
        hasCustomDataIngestion: false,
        hasEmbeddableWidgets: false,
        hasDailyBriefings: false,
        hasTimelineReplay: false,
    },
    pro: {
        maxAircraft: Infinity,
        maxSatellites: Infinity,
        maxWatchlists: 20,
        maxDashboards: 5,
        maxGeofenceAlerts: 10,
        maxAICopilotDaily: Infinity,
        historyDays: 90,
        hasMaritimeAIS: true,
        hasAPIAccess: false,
        hasTeamWorkspace: false,
        hasCustomDataIngestion: false,
        hasEmbeddableWidgets: false,
        hasDailyBriefings: true,
        hasTimelineReplay: true,
    },
    enterprise: {
        maxAircraft: Infinity,
        maxSatellites: Infinity,
        maxWatchlists: Infinity,
        maxDashboards: Infinity,
        maxGeofenceAlerts: Infinity,
        maxAICopilotDaily: Infinity,
        historyDays: 365,
        hasMaritimeAIS: true,
        hasAPIAccess: true,
        hasTeamWorkspace: true,
        hasCustomDataIngestion: true,
        hasEmbeddableWidgets: true,
        hasDailyBriefings: true,
        hasTimelineReplay: true,
    },
};

/**
 * Get the limits for a subscription tier.
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
    return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

/**
 * Check if a feature is available for the given tier.
 */
export function hasFeature(
    tier: SubscriptionTier,
    feature: keyof TierLimits
): boolean {
    const limits = getTierLimits(tier);
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    return false;
}

/**
 * Check if a numeric limit has been reached.
 */
export function isWithinLimit(
    tier: SubscriptionTier,
    limitKey: keyof TierLimits,
    currentCount: number
): boolean {
    const limits = getTierLimits(tier);
    const max = limits[limitKey];
    if (typeof max !== 'number') return true;
    return currentCount < max;
}

/**
 * Get the minimum tier required for a feature.
 */
export function requiredTier(feature: keyof TierLimits): SubscriptionTier {
    if (hasFeature('free', feature)) return 'free';
    if (hasFeature('pro', feature)) return 'pro';
    return 'enterprise';
}
