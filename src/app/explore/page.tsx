'use client';

import { useState, useRef, useEffect } from 'react';
import { useTambo } from '@tambo-ai/react';
import { Send, Sparkles, BarChart2, Database } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useConnection } from '@/lib/context/ConnectionContext';
import { reliableFetch } from '@/lib/api';

// Components
import { Header } from '@/components/Header';
import { SchemaVisualizer } from '@/components/SchemaVisualizer';

export default function ExplorePage() {
  const { isConnected } = useConnection();
  const { sendThreadMessage, thread } = useTambo();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Data State
  const [currentQuery, setCurrentQuery] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [chartConfig, setChartConfig] = useState<any | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setIsLoading(true);

    // 1. Add to Chat UI immediately
    // (In a real Tambo app, we might wait for the stream, but here we want instant feedback)

    try {
      // 2. Call our GenUI API
      const { success, data } = await reliableFetch('/explore/generate', {
        method: 'POST',
        data: { prompt: userMsg },
      });

      if (success && data) {
        setExplanation(data.explanation);
        setCurrentQuery(data.sql);
        setQueryResult(data.data);
        setChartConfig(data.chartConfig);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 font-sans">
      <Header isPaused={false} setIsPaused={() => {}} refreshInterval={0} setRefreshInterval={() => {}} />

      <main className="pt-24 px-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-6rem)]">
        {/* LEFT: Chat Interface */}
        <div className="lg:col-span-4 flex flex-col bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-white/5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs tracking-widest text-cyan-400 uppercase">Data Analyst AI</span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-hide">
            {/* Intro Message */}
            <div className="flex flex-col gap-2">
              <div className="bg-white/5 p-3 rounded-lg rounded-tl-none border border-white/10 w-fit max-w-[85%]">
                <p className="text-sm text-gray-300">
                  I'm connected to your live database. Ask me anything to explore your data.
                </p>
              </div>
              <div className="text-[10px] text-gray-600 ml-1">AI AGENT</div>
            </div>

            {/* User Query History (Simplified for v1) */}
            {explanation && (
              <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-cyan-500/10 p-3 rounded-lg rounded-tl-none border border-cyan-500/20 w-fit max-w-[90%]">
                  <p className="text-sm text-cyan-100">{explanation}</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex gap-1 ml-1 items-center">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-white/10 bg-[#0F0F0F]">
            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Show me orders from last week..."
                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-2 p-1.5 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Data Canvas (HoloDeck) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Chart Area */}
          <div className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 relative group overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {!currentQuery ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  <BarChart2 className="w-8 h-8 opacity-50" />
                </div>
                <p className="text-sm font-mono uppercase tracking-widest">Waiting for Data Signal...</p>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-6 z-10">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Generated Visualization
                  </h2>
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-1 bg-white/5 rounded border border-white/10 text-gray-400 font-mono">
                      {queryResult?.length || 0} ROWS
                    </span>
                    <span className="text-xs px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20 text-emerald-400 font-mono">
                      LIVE DATA
                    </span>
                  </div>
                </div>

                {/* Placeholder for DataChart Component */}
                <div className="flex-1 bg-black/40 rounded-xl border border-white/5 flex items-center justify-center">
                  <p className="text-sm text-gray-500">Chart Rendering Engine Loading...</p>
                </div>
              </div>
            )}
          </div>

          {/* Code Area (SQL) */}
          <div className="h-48 bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 font-mono text-xs overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2 opacity-50">
              <span className="uppercase tracking-widest text-[10px]">Generated SQL</span>
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500/50" />
                <span className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <span className="w-2 h-2 rounded-full bg-green-500/50" />
              </div>
            </div>
            <div className="flex-1 bg-black/50 rounded-lg p-3 text-emerald-400/90 overflow-auto whitespace-pre-wrap">
              {currentQuery || '-- Waiting for query generation...'}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
