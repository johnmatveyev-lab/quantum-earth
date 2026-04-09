import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Loader2, AlertTriangle, Target, TrendingUp, RefreshCw, X, Sparkles, FileText } from 'lucide-react';
import { useTrackingStore } from '@/store/useTrackingStore';
import { fetchAIAnalysis } from '@/data/services/APIService';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

type AnalysisType = 'general' | 'trajectory' | 'collision' | 'anomaly' | 'briefing';

interface Briefing {
  summary?: string;
  notableEvents?: { title: string; description: string; severity: string }[];
  activityTrends?: { trend: string }[];
  recommendations?: string[];
  objectsOfInterest?: { name: string; reason: string }[];
}

export function AIInsightsPanel() {
  const { aiPanelOpen, toggleAIPanel, aiAnalysis } = useTrackingStore();
  const [activeType, setActiveType] = useState<AnalysisType>('general');
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  const analysisTypes: { key: AnalysisType; label: string; icon: React.ReactNode }[] = [
    { key: 'general', label: 'OVERVIEW', icon: <Sparkles size={11} /> },
    { key: 'trajectory', label: 'PREDICT', icon: <TrendingUp size={11} /> },
    { key: 'collision', label: 'COLLISION', icon: <AlertTriangle size={11} /> },
    { key: 'anomaly', label: 'ANOMALY', icon: <Target size={11} /> },
    { key: 'briefing', label: 'BRIEF', icon: <FileText size={11} /> },
  ];

  const runAnalysis = async (type: AnalysisType) => {
    setActiveType(type);
    if (type === 'briefing') {
      setBriefingLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-briefing');
        if (error) throw error;
        setBriefing(data.briefing || { summary: 'No briefing data available.' });
      } catch (e: any) {
        setBriefing({ summary: `Briefing unavailable: ${e.message}` });
      } finally {
        setBriefingLoading(false);
      }
    } else {
      fetchAIAnalysis(type);
    }
  };

  return (
    <AnimatePresence>
      {aiPanelOpen && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-16 right-3 z-30 glass-panel hud-border rounded-xl w-80 max-h-[50vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div className="flex items-center gap-2">
              <Brain size={14} className="text-secondary" />
              <span className="font-display text-[9px] tracking-[0.25em] text-secondary">SKYWATCH AI</span>
            </div>
            <button onClick={toggleAIPanel} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>

          {/* Analysis type tabs */}
          <div className="flex gap-0.5 p-2 border-b border-border">
            {analysisTypes.map(t => (
              <button
                key={t.key}
                onClick={() => runAnalysis(t.key)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[8px] font-mono tracking-wider transition-all ${activeType === t.key
                  ? 'bg-secondary/15 text-secondary border border-secondary/30'
                  : 'text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            {activeType === 'briefing' ? (
              briefingLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 size={20} className="text-secondary animate-spin" />
                  <span className="font-mono text-[10px] text-muted-foreground tracking-wider">GENERATING BRIEFING...</span>
                </div>
              ) : briefing ? (
                <div className="space-y-3">
                  <p className="text-xs text-foreground leading-relaxed font-body">{briefing.summary}</p>

                  {briefing.notableEvents && briefing.notableEvents.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="font-mono text-[8px] text-muted-foreground tracking-wider">NOTABLE EVENTS</div>
                      {briefing.notableEvents.map((e, i) => (
                        <div key={i} className={`p-2 rounded-md text-[10px] font-mono ${e.severity === 'high' ? 'bg-destructive/10 border border-destructive/20' :
                            e.severity === 'medium' ? 'bg-glow-warning/10 border border-glow-warning/20' :
                              'bg-muted/20 border border-border'
                          }`}>
                          <span className={e.severity === 'high' ? 'text-destructive' : e.severity === 'medium' ? 'text-glow-warning' : 'text-accent'}>{e.title}</span>
                          <p className="text-muted-foreground mt-0.5">{e.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {briefing.objectsOfInterest && briefing.objectsOfInterest.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-mono text-[8px] text-muted-foreground tracking-wider">OBJECTS OF INTEREST</div>
                      {briefing.objectsOfInterest.map((o, i) => (
                        <div key={i} className="p-2 rounded-md bg-accent/10 border border-accent/20 text-[10px] font-mono">
                          <span className="text-accent">{o.name}</span>
                          <span className="text-muted-foreground"> — {o.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {briefing.recommendations && briefing.recommendations.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-mono text-[8px] text-muted-foreground tracking-wider">RECOMMENDATIONS</div>
                      {briefing.recommendations.map((r, i) => (
                        <div key={i} className="text-[10px] text-foreground font-body pl-2 border-l-2 border-secondary/30">{r}</div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                  <FileText size={24} className="text-muted-foreground" />
                  <span className="font-mono text-[10px] text-muted-foreground tracking-wider">CLICK TO GENERATE BRIEFING</span>
                  <span className="text-[9px] text-muted-foreground">24h activity summary powered by AI</span>
                </div>
              )
            ) : aiAnalysis.loading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 size={20} className="text-secondary animate-spin" />
                <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
                  ANALYZING...
                </span>
              </div>
            ) : aiAnalysis.summary ? (
              <div className="space-y-3">
                <p className="text-xs text-foreground leading-relaxed font-body">
                  {aiAnalysis.summary}
                </p>

                {aiAnalysis.risks && aiAnalysis.risks.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-mono text-[8px] text-muted-foreground tracking-wider">RISKS DETECTED</div>
                    {aiAnalysis.risks.map((r: any, i: number) => (
                      <div key={i} className="p-2 rounded-md bg-destructive/10 border border-destructive/20 text-[10px] font-mono">
                        <span className="text-destructive">{r.riskLevel?.toUpperCase()}</span>
                        <span className="text-muted-foreground"> — {r.object1} ↔ {r.object2}</span>
                      </div>
                    ))}
                  </div>
                )}

                {aiAnalysis.anomalies && aiAnalysis.anomalies.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-mono text-[8px] text-muted-foreground tracking-wider">ANOMALIES</div>
                    {aiAnalysis.anomalies.map((a: any, i: number) => (
                      <div key={i} className="p-2 rounded-md bg-glow-warning/10 border border-glow-warning/20 text-[10px] font-mono">
                        <span className="text-glow-warning">{a.severity?.toUpperCase()}</span>
                        <span className="text-foreground"> — {a.description}</span>
                      </div>
                    ))}
                  </div>
                )}

                {aiAnalysis.lastUpdated && (
                  <div className="font-mono text-[8px] text-muted-foreground pt-2">
                    Updated {new Date(aiAnalysis.lastUpdated).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <Brain size={24} className="text-muted-foreground" />
                <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
                  SELECT AN ANALYSIS TYPE
                </span>
                <span className="text-[9px] text-muted-foreground">
                  AI will analyze current tracking data
                </span>
              </div>
            )}
          </div>

          {/* Quick action */}
          <div className="p-2 border-t border-border">
            <button
              onClick={() => runAnalysis(activeType)}
              disabled={aiAnalysis.loading}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-secondary/10 text-secondary text-[9px] font-mono tracking-wider hover:bg-secondary/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={10} className={aiAnalysis.loading ? 'animate-spin' : ''} />
              REFRESH ANALYSIS
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
