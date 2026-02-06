'use client';

import { motion } from 'framer-motion';
import { Database, Key, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useState } from 'react';

interface ConnectDatabaseProps {
  onConnect: (config: { url: string; key: string }) => void;
}

export function ConnectDatabase({ onConnect }: ConnectDatabaseProps) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !key) return;
    setLoading(true);

    // Simulate connection check (or do real check here)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onConnect({ url, key });
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto relative z-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Connect Database</h2>
            <p className="text-xs text-neutral-400">Monitor your real production data</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono text-neutral-500 uppercase">Supabase URL</label>
            <div className="relative">
              <Database className="absolute left-3 top-3 w-4 h-4 text-neutral-600" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full bg-black/50 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-neutral-700"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono text-neutral-500 uppercase">Anon Key</label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-4 h-4 text-neutral-600" />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                className="w-full bg-black/50 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-neutral-700"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-white text-black font-bold py-3 rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Zap className="w-4 h-4 animate-pulse" />
            ) : (
              <>
                Connect & Monitor <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-center gap-2 text-[10px] text-neutral-600">
          <ShieldCheck className="w-3 h-3" />
          <span>Read-only access. Keys never stored.</span>
        </div>
      </motion.div>
    </div>
  );
}
