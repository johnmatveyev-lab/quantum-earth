import { useEffect } from 'react';
import { useTrackingStore } from '@/store/useTrackingStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      const s = useTrackingStore.getState();

      switch (e.key.toLowerCase()) {
        case 'v':
          // Voice toggle dispatched via custom event (VoiceControl listens)
          window.dispatchEvent(new CustomEvent('skywatch:toggle-voice'));
          break;
        case 'c':
          window.dispatchEvent(new CustomEvent('skywatch:toggle-copilot'));
          break;
        case 'l':
          s.toggleLayersPanel();
          break;
        case 'a':
          s.toggleAIPanel();
          break;
        case '1':
          s.selectExclusiveCategory('all');
          break;
        case '2':
          s.selectExclusiveCategory('aircraft');
          break;
        case '3':
          s.selectExclusiveCategory('satellites');
          break;
        case '4':
          s.selectExclusiveCategory('rockets');
          break;
        case ' ':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('skywatch:ptt', { detail: 'down' }));
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        window.dispatchEvent(new CustomEvent('skywatch:ptt', { detail: 'up' }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
}
