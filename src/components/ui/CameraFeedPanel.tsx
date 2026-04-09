import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, MapPin, Radio, ChevronLeft, ExternalLink } from 'lucide-react';
import { useTrackingStore } from '@/store/useTrackingStore';
import { findNearbyFeeds, CameraFeed } from '@/data/cameraFeeds';

function FeedPlayer({ feed, onBack }: { feed: CameraFeed & { distance: number }; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to feeds
      </button>
      <div className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
        <span className="text-base">{feed.thumbnailEmoji}</span> {feed.name}
      </div>
      <p className="text-[10px] text-muted-foreground mb-2">{feed.description}</p>
      <div className="relative w-full rounded-lg overflow-hidden border border-border/30 bg-black flex-1 min-h-[180px]">
        <iframe
          src={feed.feedUrl + '?autoplay=1&mute=1'}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={feed.name}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground">{feed.source}</span>
        <a href={feed.feedUrl.replace('/embed/', '/watch?v=')} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          Open <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export function CameraFeedPanel() {
  const location = useTrackingStore(s => s.cameraFeedLocation);
  const setCameraFeedLocation = useTrackingStore(s => s.setCameraFeedLocation);
  const [activeFeed, setActiveFeed] = useState<(CameraFeed & { distance: number }) | null>(null);

  const feeds = location ? findNearbyFeeds(location.lat, location.lon) : [];

  const handleClose = () => {
    setCameraFeedLocation(null);
    setActiveFeed(null);
  };

  return (
    <AnimatePresence>
      {location && (
        <motion.div
          initial={{ x: 340, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 340, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="absolute top-14 right-3 bottom-20 w-[320px] z-30 flex flex-col rounded-xl border border-border/30 backdrop-blur-2xl overflow-hidden"
          style={{ background: 'hsla(220, 30%, 8%, 0.88)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/20">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold tracking-wide text-foreground">CAMERA FEEDS</span>
            </div>
            <button onClick={handleClose} className="p-1 rounded hover:bg-accent/20 transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Location badge */}
          <div className="px-3 py-1.5 border-b border-border/10 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-primary/70" />
            <span className="text-[10px] text-muted-foreground font-mono">
              {location.lat.toFixed(2)}°{location.lat >= 0 ? 'N' : 'S'}, {Math.abs(location.lon).toFixed(2)}°{location.lon >= 0 ? 'E' : 'W'}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
            {activeFeed ? (
              <FeedPlayer feed={activeFeed} onBack={() => setActiveFeed(null)} />
            ) : feeds.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-muted-foreground">
                <Radio className="w-8 h-8 opacity-30" />
                <p className="text-xs">No camera feeds in this region</p>
                <p className="text-[10px] opacity-60">Try clicking near a major city or airport</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {feeds.some(f => f.global) && (
                  <>
                    <div className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mb-1">Global Feeds</div>
                    {feeds.filter(f => f.global).map(feed => (
                      <FeedCard key={feed.id} feed={feed} onClick={() => setActiveFeed(feed)} />
                    ))}
                  </>
                )}
                {feeds.some(f => !f.global) && (
                  <>
                    <div className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-3 mb-1">
                      Nearby ({feeds.filter(f => !f.global).length})
                    </div>
                    {feeds.filter(f => !f.global).map(feed => (
                      <FeedCard key={feed.id} feed={feed} onClick={() => setActiveFeed(feed)} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FeedCard({ feed, onClick }: { feed: CameraFeed & { distance: number }; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/10 transition-all group text-left"
    >
      <span className="text-xl shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
        {feed.thumbnailEmoji}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground truncate">{feed.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{feed.source}</span>
          {!feed.global && feed.distance > 0 && (
            <span className="text-[10px] text-muted-foreground/60">{Math.round(feed.distance)} km</span>
          )}
        </div>
      </div>
      <Radio className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary/80 transition-colors shrink-0" />
    </button>
  );
}
