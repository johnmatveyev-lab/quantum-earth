import { Suspense } from 'react';
import { GlobeScene } from '@/components/Globe/GlobeScene';
import { ControlBar } from '@/components/ui/ControlBar';
import { ObjectList } from '@/components/ui/ObjectList';
import { InfoPanel } from '@/components/ui/InfoPanel';
import { StatsBar } from '@/components/ui/StatsBar';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { TimelineController } from '@/components/ui/TimelineController';
import { AIInsightsPanel } from '@/components/ui/AIInsightsPanel';
import { AICopilot } from '@/components/ui/AICopilot';
import { LayersPanel } from '@/components/ui/LayersPanel';
import { VoiceHub } from '@/components/VoiceHub';
import { ComparisonPanel } from '@/components/ui/ComparisonPanel';
import { CameraFeedPanel } from '@/components/ui/CameraFeedPanel';
import { AdvancedFilterPanel } from '@/components/ui/AdvancedFilterPanel';
import { WatchlistPanel } from '@/components/ui/WatchlistPanel';
import { StreetViewOverlay } from '@/components/ui/StreetViewOverlay';
import { SatelliteViewOverlay } from '@/components/ui/SatelliteViewOverlay';
import { ErrorBoundary, GlobeErrorFallback } from '@/components/ErrorBoundary';
import { useTracking } from '@/hooks/useTracking';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useGeofenceAlerts } from '@/hooks/useGeofenceAlerts';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';

const Index = () => {
  useTracking();
  useKeyboardShortcuts();
  useGeofenceAlerts();
  useRealtimeAlerts();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      {/* 3D Scene — wrapped in error boundary so WebGL failures don't crash the app */}
      <ErrorBoundary fallback={<GlobeErrorFallback />}>
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="font-display text-[10px] tracking-[0.3em] text-primary animate-pulse-glow">INITIALIZING MISSION CONTROL</p>
              <p className="font-mono text-[8px] text-muted-foreground mt-2">Loading globe textures...</p>
            </div>
          </div>
        }>
          <GlobeScene />
        </Suspense>
      </ErrorBoundary>

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 50%, hsla(220, 30%, 5%, 0.6) 100%),
            linear-gradient(180deg, hsla(220, 30%, 5%, 0.3) 0%, transparent 15%, transparent 85%, hsla(220, 30%, 5%, 0.4) 100%)
          `,
        }}
      />

      {/* HUD corners */}
      <CornerMarker position="top-left" />
      <CornerMarker position="top-right" />
      <CornerMarker position="bottom-left" />
      <CornerMarker position="bottom-right" />

      {/* HUD UI */}
      <ControlBar />
      <ObjectList />
      <InfoPanel />
      <StatsBar />
      <HoverTooltip />
      <TimelineController />
      <AIInsightsPanel />
      <AICopilot />
      <LayersPanel />
      <VoiceHub />
      <ComparisonPanel />
      <CameraFeedPanel />
      <AdvancedFilterPanel />
      <WatchlistPanel />
      <StreetViewOverlay />
      <SatelliteViewOverlay />
    </div>
  );
};

function CornerMarker({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const posClasses = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0 rotate-90',
    'bottom-left': 'bottom-0 left-0 -rotate-90',
    'bottom-right': 'bottom-0 right-0 rotate-180',
  };

  return (
    <div className={`absolute ${posClasses[position]} z-10 pointer-events-none`}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M0 20 L0 2 Q0 0 2 0 L20 0" stroke="hsla(195, 100%, 50%, 0.2)" strokeWidth="1" />
        <circle cx="2" cy="2" r="1.5" fill="hsla(195, 100%, 50%, 0.4)" />
      </svg>
    </div>
  );
}

export default Index;
