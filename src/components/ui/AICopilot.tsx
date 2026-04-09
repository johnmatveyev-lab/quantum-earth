import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, Bot, User, Sparkles, Wrench, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTrackingStore, GlobeLayer } from '@/store/useTrackingStore';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}

// Client-side tool execution
function executeToolCall(name: string, args: any): string {
  const s = useTrackingStore.getState();
  switch (name) {
    case 'zoom_to_location':
      s.setSelectedObject({
        id: `copilot-${Date.now()}`,
        name: args.name || `${args.lat.toFixed(2)}, ${args.lon.toFixed(2)}`,
        type: 'aircraft',
        latitude: args.lat,
        longitude: args.lon,
        altitude: 0, speed: 0, heading: 0, status: 'active',
      });
      return `Zoomed to ${args.name || 'location'}`;
    case 'toggle_layer': {
      const layer = args.layer as GlobeLayer;
      const isActive = s.activeLayers.has(layer);
      const shouldEnable = args.enabled !== undefined ? args.enabled : !isActive;
      if (shouldEnable !== isActive) s.toggleLayer(layer);
      return `${layer} layer ${shouldEnable ? 'enabled' : 'disabled'}`;
    }
    case 'toggle_category':
      s.selectExclusiveCategory(args.category);
      return `Showing ${args.category}`;
    case 'search_objects':
      s.setSearchQuery(args.query);
      const all = [...s.aircraft, ...s.satellites, ...s.rockets];
      const m = all.filter(o => o.name.toLowerCase().includes(args.query.toLowerCase()));
      return `Found ${m.length} matching "${args.query}": ${m.slice(0, 5).map(o => o.name).join(', ')}`;
    case 'get_tracking_stats':
      return `Tracking: ${s.aircraft.length} aircraft, ${s.satellites.length} satellites, ${s.rockets.length} rockets. Source: ${s.dataSource}. Speed: ${s.simulationSpeed}x.`;
    case 'set_data_source':
      s.setDataSource(args.source);
      return `Switched to ${args.source}`;
    case 'set_simulation_speed':
      s.setSimulationSpeed(Math.max(0.1, Math.min(10, args.speed)));
      return `Speed set to ${args.speed}x`;
    default:
      return `Unknown tool: ${name}`;
  }
}

export function AICopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { aircraft, satellites, rockets, copilotOpen, setCopilotOpen } = useTrackingStore();

  // Sync with store
  useEffect(() => { setOpen(copilotOpen); }, [copilotOpen]);
  useEffect(() => { setCopilotOpen(open); }, [open, setCopilotOpen]);

  // Listen for keyboard shortcut
  useEffect(() => {
    const onToggle = () => setOpen(prev => !prev);
    window.addEventListener('skywatch:toggle-copilot', onToggle);
    return () => window.removeEventListener('skywatch:toggle-copilot', onToggle);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const processToolCalls = useCallback(async (toolCalls: ToolCall[], currentMessages: Message[]): Promise<Message[]> => {
    const toolResults: Message[] = [];

    for (const tc of toolCalls) {
      try {
        const args = JSON.parse(tc.function.arguments);
        const result = executeToolCall(tc.function.name, args);
        toolResults.push({
          role: 'tool',
          content: `🔧 **${tc.function.name}**: ${result}`,
        });
      } catch (e) {
        toolResults.push({
          role: 'tool',
          content: `⚠️ Tool error: ${tc.function.name}`,
        });
      }
    }

    return toolResults;
  }, []);

  async function sendMessage(overrideMessages?: Message[]) {
    const messagesToSend = overrideMessages || messages;

    if (!overrideMessages) {
      if (!input.trim() || isStreaming) return;
      const userMsg: Message = { role: 'user', content: input };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput('');
      setIsStreaming(true);

      if (user) {
        await supabase.from('ai_chat_messages').insert({ user_id: user.id, role: 'user', content: input });
      }

      return await streamResponse(newMessages);
    } else {
      return await streamResponse(messagesToSend);
    }
  }

  async function streamResponse(allMessages: Message[]) {
    setIsStreaming(true);
    const context = `Current tracking data: ${aircraft.length} aircraft, ${satellites.length} satellites, ${rockets.length} rockets active.`;

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_GEMINI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are SKYWATCH AI Copilot, an aerospace intelligence assistant. Current context: ${context}
Tools available: zoom_to_location, toggle_layer, toggle_category, search_objects, get_tracking_stats, set_data_source, set_simulation_speed.
Be concise.`,
            },
            ...allMessages.slice(-12).map((m) => ({
              role: m.role === 'tool' ? 'user' : m.role,
              content: m.content,
            })),
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'zoom_to_location',
                description: 'Zoom the globe camera to a specific geographic location',
                parameters: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number' },
                    lon: { type: 'number' },
                    name: { type: 'string' },
                  },
                  required: ['lat', 'lon'],
                },
              },
            },
            {
              type: 'function',
              function: {
                name: 'toggle_layer',
                description: 'Toggle a visualization layer. Available: infrared, vegetation, seaTemp, waterVapor, nightLights, clouds, aurora, atmosphere, graticule, orbits, heatmap, corridors, countryBorders, precipitation, terrain, predictions',
                parameters: {
                  type: 'object',
                  properties: {
                    layer: { type: 'string' },
                    enabled: { type: 'boolean' },
                  },
                  required: ['layer'],
                },
              },
            },
            {
              type: 'function',
              function: {
                name: 'toggle_category',
                description: 'Show only a specific tracking category: aircraft, satellites, rockets, starlink, all',
                parameters: {
                  type: 'object',
                  properties: {
                    category: { type: 'string' },
                  },
                  required: ['category'],
                },
              },
            },
            {
              type: 'function',
              function: {
                name: 'search_objects',
                description: 'Search tracked objects by name',
                parameters: {
                  type: 'object',
                  properties: { query: { type: 'string' } },
                  required: ['query'],
                },
              },
            },
            {
              type: 'function',
              function: {
                name: 'get_tracking_stats',
                description: 'Get current tracking statistics',
              },
            },
          ],
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        if (response.status === 429) {
          setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Rate limit exceeded. Please try again in a moment.' }]);
          return;
        }
        if (response.status === 402) {
          setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ AI credits exhausted. Please add credits.' }]);
          return;
        }
        throw new Error('Stream failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let toolCalls: ToolCall[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const choice = parsed.choices?.[0];

            // Handle tool calls
            if (choice?.delta?.tool_calls) {
              for (const tc of choice.delta.tool_calls) {
                if (tc.index !== undefined) {
                  while (toolCalls.length <= tc.index) {
                    toolCalls.push({ id: '', function: { name: '', arguments: '' } });
                  }
                  if (tc.id) toolCalls[tc.index].id = tc.id;
                  if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
                  if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
                }
              }
            }

            const content = choice?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch { }
        }
      }

      // Handle tool calls if present
      if (toolCalls.length > 0 && toolCalls[0].function.name) {
        const toolResults = await processToolCalls(toolCalls, allMessages);
        setMessages(prev => [...prev, ...toolResults]);

        // Re-stream with tool results for follow-up
        const updatedMessages: Message[] = [
          ...allMessages,
          { role: 'assistant', content: assistantContent, toolCalls },
          ...toolResults,
        ];
        await streamResponse(updatedMessages);
        return;
      }

      if (user && assistantContent) {
        await supabase.from('ai_chat_messages').insert({ user_id: user.id, role: 'assistant', content: assistantContent });
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Unable to connect to AI. Please try again.' }]);
    } finally {
      setIsStreaming(false);
    }
  }

  const quickQuestions = [
    'What aircraft are currently in the air?',
    'Show me New York on the globe',
    'Toggle the night lights layer',
    'Any anomalies detected?',
  ];

  return (
    <>
      {/* FAB */}
      {!open && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center text-secondary hover:bg-secondary/30 transition-all shadow-lg"
          style={{ boxShadow: '0 0 20px hsla(260, 70%, 60%, 0.3)' }}
        >
          <MessageSquare size={18} />
        </motion.button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-4 right-4 z-50 glass-panel hud-border rounded-xl w-[360px] h-[500px] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-secondary" />
                <span className="font-display text-[10px] tracking-[0.25em] text-secondary">AI COPILOT [C]</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('skywatch:toggle-voice'))}
                  className="text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-primary/10"
                  title="Toggle Voice AI [V]"
                >
                  <Mic size={12} />
                </button>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Bot size={28} className="text-secondary/30 mx-auto mb-3" />
                  <p className="font-display text-[9px] text-muted-foreground tracking-[0.2em] mb-4">
                    ASK ABOUT AEROSPACE ACTIVITY
                  </p>
                  <div className="space-y-1.5">
                    {quickQuestions.map(q => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); }}
                        className="block w-full text-left px-3 py-1.5 rounded-lg bg-muted/20 text-[10px] font-body text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot size={10} className="text-secondary" />
                      </div>
                    )}
                    {msg.role === 'tool' && (
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Wrench size={10} className="text-accent" />
                      </div>
                    )}
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-xs font-body ${msg.role === 'user'
                      ? 'bg-primary/15 border border-primary/20 text-foreground'
                      : msg.role === 'tool'
                        ? 'bg-accent/10 border border-accent/20 text-foreground'
                        : 'bg-muted/20 border border-border text-foreground'
                      }`}>
                      {msg.role !== 'user' ? (
                        <div className="prose prose-sm prose-invert max-w-none [&_p]:text-xs [&_p]:text-foreground [&_p]:leading-relaxed [&_p]:my-1 [&_strong]:text-primary [&_code]:text-accent [&_code]:text-[10px] [&_li]:text-xs [&_li]:text-foreground">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User size={10} className="text-primary" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Loader2 size={10} className="text-secondary animate-spin" />
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-muted/20 border border-border">
                    <span className="font-mono text-[9px] text-muted-foreground animate-pulse">Analyzing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask about aerospace activity..."
                  disabled={isStreaming}
                  className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-secondary/50 transition-all disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={isStreaming || !input.trim()}
                  className="px-3 py-2 rounded-lg bg-secondary/20 border border-secondary/40 text-secondary hover:bg-secondary/30 transition-all disabled:opacity-30"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
