'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Send, RefreshCw, Layers } from 'lucide-react';
import { SecurityBomb } from '@/components/roast/SecurityBomb';
import { SpaghettiMeter } from '@/components/roast/SpaghettiMeter';
import { PerformanceTurtle } from '@/components/roast/PerformanceTurtle';
import { GenericRoast } from '@/components/roast/GenericRoast';

export default function CodeCritic() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<any[]>([]);
  const [roastLevel, setRoastLevel] = useState('medium');

  const handleRoast = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setIssues([]); // Clear previous

    try {
      const res = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: 'javascript', // Detect later
          roastLevel,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIssues(data.issues);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to roast. The AI might be too stunned by your code.');
    } finally {
      setLoading(false);
    }
  };

  const renderWidget = (issue: any, index: number) => {
    const props = {
      key: index,
      title: issue.title,
      roast: issue.roast,
      explanation: issue.explanation,
      severity: issue.severity,
      config: issue.widget_config,
    };

    switch (issue.widget_type) {
      case 'SecurityBomb':
        return <SecurityBomb {...props} />;
      case 'SpaghettiMeter':
        return <SpaghettiMeter {...props} />;
      case 'PerformanceTurtle':
        return <PerformanceTurtle {...props} />;
      default:
        return <GenericRoast {...props} />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-red-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded-lg">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Code Critic</h1>
          </div>
          <div className="flex gap-2">
            {['gentle', 'medium', 'savage'].map((level) => (
              <button
                key={level}
                onClick={() => setRoastLevel(level)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all uppercase ${
                  roastLevel === level ? 'bg-white text-black' : 'bg-white/10 text-white/50 hover:bg-white/20'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 grid lg:grid-cols-2 gap-8 h-[calc(100vh-64px)] overflow-hidden">
        {/* LEFT: Input Area */}
        <div className="flex flex-col gap-4 h-full">
          <div className="flex-1 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-purple-500/10 rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="// Paste your questionable code here..."
              className="w-full h-full bg-black/40 border border-white/10 rounded-2xl p-6 font-mono text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none transition-all placeholder:text-gray-700"
              spellCheck={false}
            />
          </div>

          <button
            onClick={handleRoast}
            disabled={loading || !code.trim()}
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-lg shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Analyzing Complexity...
              </>
            ) : (
              <>
                <Flame className="w-5 h-5 text-red-600" />
                ROAST MY CODE
              </>
            )}
          </button>
        </div>

        {/* RIGHT: Output Area (Generative UI) */}
        <div className="relative h-full overflow-y-auto pr-2 pb-20 no-scrollbar">
          <h2 className="text-sm font-semibold text-gray-500 mb-4 flex items-center gap-2 sticky top-0 bg-neutral-950/80 backdrop-blur-xl py-2 z-10">
            <Layers className="w-4 h-4" />
            GENERATIVE CRITIQUE
          </h2>

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {issues.length > 0
                ? issues.map((issue, index) => (
                    <motion.div
                      key={index}
                      layout
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {renderWidget(issue, index)}
                    </motion.div>
                  ))
                : !loading && (
                    <div className="flex flex-col items-center justify-center h-[500px] text-gray-600 border-2 border-dashed border-white/5 rounded-2xl">
                      <div className="text-4xl mb-4 grayscale opacity-20">🎭</div>
                      <p>Paste code to trigger the Generative UI engine.</p>
                    </div>
                  )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
