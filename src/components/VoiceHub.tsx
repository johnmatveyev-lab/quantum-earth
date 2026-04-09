import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceControl } from '@/components/ui/VoiceControl';
import { VoiceCopilot } from '@/components/VoiceCopilot';

type VoiceMode = 'livekit' | 'xai';

export function VoiceHub() {
  const [mode, setMode] = useState<VoiceMode>('livekit');

  const toggleMode = () => {
    setMode((prev) => (prev === 'livekit' ? 'xai' : 'livekit'));
  };

  return (
    <>
      {mode === 'livekit' ? <VoiceControl /> : <VoiceCopilot />}

      {/* Mode toggle */}
      <AnimatePresence>
        <motion.button
          key="voice-mode-toggle"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          onClick={toggleMode}
          title="Switch Voice Provider"
          className="fixed bottom-20 left-20 z-40 rounded-full px-3 py-1.5 text-[8px] font-mono tracking-widest uppercase glass-panel hud-border border-border/60 text-foreground/70 hover:text-foreground transition-colors"
        >
          MODE: {mode === 'livekit' ? 'LIVEKIT' : 'XAI'}
        </motion.button>
      </AnimatePresence>
    </>
  );
}
