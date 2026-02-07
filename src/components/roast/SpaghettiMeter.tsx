'use client';

import { motion } from 'framer-motion';
import { ChefHat } from 'lucide-react';

interface SpaghettiMeterProps {
  title: string;
  roast: string;
  explanation: string;
  config?: {
    complexity?: number; // 0-100
  };
}

export function SpaghettiMeter({ title, roast, explanation, config }: SpaghettiMeterProps) {
  const complexity = config?.complexity || 80;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="group relative overflow-hidden rounded-xl border-2 border-yellow-500/30 bg-yellow-950/30 p-6 backdrop-blur-sm transition-all hover:border-yellow-500/50"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-yellow-500/10 p-3 ring-1 ring-yellow-500/30">
          <div className="text-3xl">🍝</div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-lg font-bold text-yellow-500">{title}</h3>
            <p className="text-sm text-yellow-200/60 font-mono">SPAGHETTI CODE DETECTED</p>
          </div>

          <p className="text-md font-medium italic text-yellow-100">"{roast}"</p>

          {/* Meter UI */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-yellow-500/80">
              <span>Clean Code</span>
              <span>Mama Mia! ({complexity}%)</span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${complexity}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className={`h-full ${
                  complexity > 80 ? 'bg-red-500' : complexity > 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
              />
            </div>
          </div>

          <p className="text-xs text-yellow-200/50 leading-relaxed pt-2 border-t border-yellow-500/20">{explanation}</p>
        </div>
      </div>
    </motion.div>
  );
}
