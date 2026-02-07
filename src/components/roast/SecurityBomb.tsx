'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Bomb } from 'lucide-react';

interface SecurityBombProps {
  title: string;
  roast: string;
  explanation: string;
  severity: string;
  config?: {
    explosionSize?: 'big' | 'small';
  };
}

export function SecurityBomb({ title, roast, explanation, severity, config }: SecurityBombProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative overflow-hidden rounded-xl border-4 border-red-500/50 bg-red-950/90 p-6 text-red-100 shadow-[0_0_50px_-12px_rgba(239,68,68,0.5)]"
    >
      {/* Background Pulse Animation */}
      <motion.div
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 bg-red-500/10"
      />

      <div className="relative z-10 flex items-start gap-4">
        <div className="rounded-full bg-red-500/20 p-3 ring-1 ring-red-500/50">
          <Bomb className="h-8 w-8 text-red-500 animate-pulse" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500 ring-1 ring-inset ring-red-500/20">
              CRITICAL VULNERABILITY
            </span>
            <span className="text-xs text-red-400 font-mono">SEVERITY: {severity.toUpperCase()}</span>
          </div>

          <h3 className="text-xl font-black uppercase tracking-tight text-red-500">{title}</h3>

          <p className="mt-2 text-lg font-medium italic text-red-200">"{roast}"</p>

          <div className="mt-4 rounded-lg bg-black/40 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-1">
              <AlertTriangle className="h-4 w-4" />
              What's actually wrong:
            </div>
            <p className="text-sm text-red-100/80 leading-relaxed">{explanation}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
