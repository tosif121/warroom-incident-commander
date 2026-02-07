'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, RefreshCw, Github, FileCode, GitPullRequest, History, ExternalLink, Trash2 } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type InputMode = 'code' | 'github_file' | 'github_pr' | 'history';

interface RoastHistory {
  id: string;
  date: string;
  type: string;
  summary: string;
  total_score?: number;
}

export default function CodeCritic() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>('code');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [roastLevel, setRoastLevel] = useState('medium');
  const [history, setHistory] = useState<RoastHistory[]>([]);

  useEffect(() => {
    if (mode === 'history') {
      const stored = localStorage.getItem('roast_history');
      if (stored) {
        try {
          setHistory(JSON.parse(stored));
        } catch (error) {
          console.error('Failed to parse history:', error);
          localStorage.removeItem('roast_history');
        }
      }
    }
  }, [mode]);

  const saveToHistory = (session_id: string, type: string, summary: string) => {
    const newItem: RoastHistory = {
      id: session_id,
      date: new Date().toLocaleDateString(),
      type,
      summary: summary.substring(0, 50) + (summary.length > 50 ? '...' : ''),
    };
    const updated = [newItem, ...history].slice(0, 10); // Keep last 10
    setHistory(updated);
    localStorage.setItem('roast_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('roast_history');
    toast.success('History cleared');
  };

  const getPlaceholder = () => {
    if (mode === 'github_file') return 'https://github.com/username/repo/blob/main/file.js';
    if (mode === 'github_pr') return 'https://github.com/username/repo/pull/123';
    return '// Paste your questionable code here...';
  };

  const handleRoast = async () => {
    if (!content.trim()) return;
    setLoading(true);

    try {
      const payload: any = {
        input_type: mode,
        roastLevel,
      };

      if (mode === 'code') {
        payload.code = content;
      } else {
        payload.github_url = content;
      }

      const res = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success && data.session_id) {
        saveToHistory(data.session_id, mode, mode === 'code' ? 'Code Snippet' : content);
        toast.success('Roast initiated! Redirecting...');
        router.push(`/review/${data.session_id}`);
      } else {
        toast.error(data.error || 'Failed to start roast session');
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to connect to Roast API.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded-lg shadow-lg shadow-red-500/20">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Code Critic</h1>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2 p-1 bg-muted/50 rounded-full border border-border">
              {['gentle', 'medium', 'savage'].map((level) => (
                <button
                  key={level}
                  onClick={() => setRoastLevel(level)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all uppercase ${
                    roastLevel === level
                      ? 'bg-foreground text-background font-bold shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto flex flex-col gap-6"
        >
          <div className="text-center space-y-4 mb-8">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              Roast My Code.
            </h2>
            <p className="text-xl text-muted-foreground font-medium max-w-xl mx-auto">
              Get a 2-minute AI audit that finds security risks, spaghetti code, and emotional damage.
            </p>
          </div>

          {/* Input Mode Tabs */}
          <div className="flex justify-center gap-4 mb-4 flex-wrap">
            <button
              onClick={() => setMode('code')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${mode === 'code' ? 'bg-foreground text-background shadow-lg' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              <FileCode className="w-4 h-4" /> Snippet
            </button>
            <button
              onClick={() => setMode('github_file')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${mode === 'github_file' ? 'bg-foreground text-background shadow-lg' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              <Github className="w-4 h-4" /> GitHub File
            </button>
            <button
              onClick={() => setMode('github_pr')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${mode === 'github_pr' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              <GitPullRequest className="w-4 h-4" /> Pull Request
            </button>
            <button
              onClick={() => setMode('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${mode === 'history' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              <History className="w-4 h-4" /> History
            </button>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-purple-500/10 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />

            {mode === 'history' ? (
              <div className="relative w-full min-h-[300px] bg-card/80 backdrop-blur-sm border border-input rounded-2xl p-6 shadow-2xl space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Recent Roasts</h3>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-xs text-red-500 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Clear History
                    </button>
                  )}
                </div>
                {history.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No history yet. Get roasting!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium flex items-center gap-2">
                            {item.type === 'github_pr' ? (
                              <GitPullRequest className="w-3 h-3 text-purple-500" />
                            ) : item.type === 'github_file' ? (
                              <Github className="w-3 h-3" />
                            ) : (
                              <FileCode className="w-3 h-3" />
                            )}
                            {item.summary}
                          </span>
                          <span className="text-xs text-muted-foreground">{item.date}</span>
                        </div>
                        <button
                          onClick={() => router.push(`/review/${item.id}`)}
                          className="p-2 bg-background rounded-full hover:scale-110 transition-transform shadow-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : mode === 'code' ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={getPlaceholder()}
                className="relative w-full h-[300px] bg-card/80 backdrop-blur-sm border border-input rounded-2xl p-6 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none shadow-2xl"
                spellCheck={false}
              />
            ) : (
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={getPlaceholder()}
                className="relative w-full h-16 bg-card/80 backdrop-blur-sm border border-input rounded-2xl px-6 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-2xl"
              />
            )}
          </div>

          {mode !== 'history' && (
            <button
              onClick={handleRoast}
              disabled={loading || !content.trim()}
              className="w-full bg-foreground text-background font-bold py-4 rounded-xl text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Starting Analysis...
                </>
              ) : (
                <>
                  <Flame className="w-5 h-5 text-red-600 transition-transform group-hover:scale-110" />
                  {mode === 'github_pr' ? 'ROAST THIS PR' : 'AUDIT MY CODE'}
                </>
              )}
            </button>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
