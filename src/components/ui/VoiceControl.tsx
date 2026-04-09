import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, Loader2, Phone, PhoneOff } from "lucide-react";
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useTrackTranscription,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { useTrackingStore } from "@/store/useTrackingStore";
import { useAuth } from "@/hooks/useAuth";

interface TranscriptLine {
  role: "user" | "assistant";
  text: string;
  id: number;
}

function VoiceSession({
  onTranscript,
}: {
  onTranscript: (line: TranscriptLine) => void;
}) {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const { segments: userSegments } = useTrackTranscription({
    publication: localParticipant?.getTrackPublication(Track.Source.Microphone),
    source: Track.Source.Microphone,
    participant: localParticipant,
  });

  const idRef = useRef(0);
  const lastTextRef = useRef("");
  const lastUserTextRef = useRef("");
  const lastLocRef = useRef<"nyc" | "boca" | null>(null);

  const setCameraFeedLocation = useTrackingStore(
    (s) => s.setCameraFeedLocation,
  );
  const setStreetViewLocation = useTrackingStore(
    (s) => s.setStreetViewLocation,
  );
  const setSatelliteViewLocation = useTrackingStore(
    (s) => s.setSatelliteViewLocation,
  );
  const setSelectedObject = useTrackingStore((s) => s.setSelectedObject);

  // Forward agent transcriptions
  useEffect(() => {
    if (!agentTranscriptions || agentTranscriptions.length === 0) return;
    const latest = agentTranscriptions[agentTranscriptions.length - 1];
    if (latest && latest.text && latest.text !== lastTextRef.current) {
      lastTextRef.current = latest.text;
      if (latest.final) {
        onTranscript({
          role: "assistant",
          text: latest.text,
          id: ++idRef.current,
        });

        // Voice Agent Demo Triggers
        const txt = latest.text.toLowerCase();

        const isNYC = txt.includes("new york");
        const isBoca =
          txt.includes("boca chica") ||
          txt.includes("star base") ||
          txt.includes("starbase");

        if (isNYC) lastLocRef.current = "nyc";
        if (isBoca) lastLocRef.current = "boca";

        if (
          isNYC ||
          isBoca ||
          txt.includes("satellite") ||
          txt.includes("street") ||
          txt.includes("zoom")
        ) {
          const loc = lastLocRef.current;
          if (!loc) return;

          const lat = loc === "nyc" ? 40.7128 : 25.9972;
          const lon = loc === "nyc" ? -74.006 : -97.1561;
          const name = loc === "nyc" ? "New York City" : "Boca Chica";
          const id = loc === "nyc" ? "demo-nyc" : "demo-boca";

          if (txt.includes("satellite")) {
            setSatelliteViewLocation({ lat, lon });
            setStreetViewLocation(null);
            setCameraFeedLocation(null);
          } else if (txt.includes("street")) {
            setStreetViewLocation({ lat, lon });
            setSatelliteViewLocation(null);
            setCameraFeedLocation(null);
          } else if (
            isNYC ||
            isBoca ||
            txt.includes("zoom") ||
            txt.includes("zooming") ||
            txt.includes("demo")
          ) {
            // General zoom/fly to location
            setSelectedObject({
              id,
              name,
              type: "aircraft",
              latitude: lat,
              longitude: lon,
              altitude: 0,
              speed: 0,
              heading: 0,
              status: "active",
            });
            setSatelliteViewLocation(null);
            setStreetViewLocation(null);
            setCameraFeedLocation(null);
          }
        }
      }
    }
  }, [
    agentTranscriptions,
    onTranscript,
    setCameraFeedLocation,
    setStreetViewLocation,
    setSatelliteViewLocation,
    setSelectedObject,
  ]);

  // Forward user transcriptions
  useEffect(() => {
    if (!userSegments || userSegments.length === 0) return;
    const latest = userSegments[userSegments.length - 1];
    if (latest && latest.text && latest.text !== lastUserTextRef.current) {
      lastUserTextRef.current = latest.text;
      if (latest.final) {
        onTranscript({
          role: "user",
          text: latest.text,
          id: ++idRef.current,
        });
      }
    }
  }, [userSegments, onTranscript]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Status indicator */}
      <div className="font-display text-[9px] tracking-[0.25em] text-muted-foreground uppercase">
        {state === "connecting" && "Connecting..."}
        {state === "initializing" && "Initializing agent..."}
        {state === "listening" && "Listening..."}
        {state === "thinking" && "Processing..."}
        {state === "speaking" && "Speaking..."}
        {state === "idle" && "Ready"}
        {state === "disconnected" && "Disconnected"}
      </div>

      {/* Audio visualizer */}
      {audioTrack && (
        <div className="w-full h-16 flex items-center justify-center">
          <BarVisualizer
            state={state}
            trackRef={audioTrack}
            barCount={24}
            style={{
              width: "100%",
              height: "100%",
            }}
            className="lk-voice-visualizer"
          />
        </div>
      )}

      {/* Pulsing orb when no track */}
      {!audioTrack && (
        <div className="relative w-16 h-16 flex items-center justify-center">
          <motion.div
            animate={{
              scale: state === "listening" ? [1, 1.2, 1] : 1,
              opacity: state === "listening" ? [0.4, 0.8, 0.4] : 0.3,
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-primary/20 border border-primary/30"
          />
          <Volume2
            size={20}
            className={`text-primary ${state === "speaking" ? "animate-pulse" : ""}`}
          />
        </div>
      )}
    </div>
  );
}

export function VoiceControl() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Listen for keyboard shortcut (V key)
  useEffect(() => {
    const onToggle = () => {
      if (isConnected) {
        disconnect();
      } else {
        connect();
      }
    };
    window.addEventListener("skywatch:toggle-voice", onToggle);
    return () => window.removeEventListener("skywatch:toggle-voice", onToggle);
  }, [isConnected]);

  const handleTranscript = useCallback((line: TranscriptLine) => {
    setTranscript((prev) => [...prev.slice(-20), line]);
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livekit-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            room: "skywatch-copilot",
            participant: user?.email || `user-${Date.now()}`,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`);
      }

      const data = await response.json();
      setToken(data.token);
      setLivekitUrl(data.url || import.meta.env.VITE_LIVEKIT_URL);
      setIsConnected(true);
    } catch (e) {
      console.error("LiveKit connection error:", e);
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, [user]);

  const disconnect = useCallback(() => {
    setToken(null);
    setIsConnected(false);
    setTranscript([]);
  }, []);

  return (
    <>
      {/* Floating voice button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={isConnected ? disconnect : connect}
        disabled={isConnecting}
        title="Voice AI (LiveKit)"
        data-testid="voice-control-toggle"
        className={`fixed bottom-20 left-4 z-40 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${isConnected
          ? "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30"
          : isConnecting
            ? "bg-primary/10 border border-primary/20 text-primary/50"
            : "bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
          }`}
        style={{
          boxShadow: isConnected
            ? "0 0 20px hsla(0, 70%, 50%, 0.3)"
            : "0 0 20px hsla(195, 100%, 50%, 0.2)",
        }}
      >
        {isConnecting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : isConnected ? (
          <PhoneOff size={18} />
        ) : (
          <Mic size={18} />
        )}
      </motion.button>

      {/* Voice label */}
      <AnimatePresence>
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="fixed bottom-[92px] left-4 z-40"
          >
            <span className="font-display text-[8px] tracking-[0.3em] text-primary/60 uppercase">
              Voice AI [V]
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LiveKit Room + Transcript panel */}
      <AnimatePresence>
        {isConnected && token && livekitUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-36 left-4 z-50 glass-panel hud-border rounded-xl w-[300px] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-display text-[9px] tracking-[0.25em] text-primary">
                  VOICE COPILOT
                </span>
              </div>
              <button
                onClick={disconnect}
                className="text-muted-foreground hover:text-red-400 transition-colors"
              >
                <PhoneOff size={12} />
              </button>
            </div>

            {/* LiveKit Room */}
            <div className="p-4">
              <LiveKitRoom
                serverUrl={livekitUrl}
                token={token}
                connect={true}
                audio={true}
                video={false}
                onDisconnected={() => {
                  setIsConnected(false);
                  setToken(null);
                }}
                onError={(err) => {
                  console.error("LiveKit room error:", err);
                  setError(err?.message || "Room connection error");
                }}
                style={
                  {
                    // Reset LiveKit's default styles
                    "--lk-bg": "transparent",
                    "--lk-bg2": "transparent",
                  } as React.CSSProperties
                }
              >
                <VoiceSession onTranscript={handleTranscript} />
                <RoomAudioRenderer />
                {/* Control bar for mic toggle */}
                <div className="flex justify-center mt-4">
                  <VoiceAssistantControlBar controls={{ leave: false }} />
                </div>
              </LiveKitRoom>
            </div>

            {/* Transcript */}
            {transcript.length > 0 && (
              <div className="border-t border-border max-h-[200px] overflow-y-auto scrollbar-thin px-3 py-2 space-y-1.5">
                {transcript.map((line) => (
                  <div
                    key={line.id}
                    className={`text-[10px] font-body ${line.role === "user"
                      ? "text-primary/80"
                      : "text-foreground/80"
                      }`}
                  >
                    <span className="font-display text-[8px] tracking-[0.15em] text-muted-foreground mr-1.5">
                      {line.role === "user" ? "YOU" : "AI"}:
                    </span>
                    {line.text}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-36 left-4 z-50 glass-panel hud-border rounded-lg px-4 py-2 max-w-[280px]"
          >
            <p className="text-[10px] font-body text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-[8px] font-display tracking-widest text-muted-foreground hover:text-foreground mt-1"
            >
              DISMISS
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
