'use client';

import { motion } from 'framer-motion';
import { Timer, Snail } from 'lucide-react';

interface PerformanceTurtleProps {
  title: string;
  roast: string;
  explanation: string;
  config?: {
    speed?: 'slow' | 'crawl';
  };
}

export function PerformanceTurtle({ title, roast, explanation, config }: PerformanceTurtleProps) {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="relative overflow-hidden rounded-xl border-2 border-blue-500/30 bg-blue-950/30 p-6 backdrop-blur-sm"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-blue-500/10 p-3 ring-1 ring-blue-500/30">
          <Snail className="h-6 w-6 text-blue-400" />
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-lg font-bold text-blue-400">{title}</h3>
            <p className="text-sm text-blue-200/60 font-mono">O(N²) PERFORMANCE DETECTED</p>
          </div>

          <p className="text-md font-medium italic text-blue-100">"{roast}"</p>

          <div className="relative h-12 w-full rounded-lg bg-black/40 ring-1 ring-white/10 overflow-hidden">
            {/* Track lines */}
            <div className="absolute inset-0 flex flex-col justify-center space-y-2 px-2 opacity-20">
              <div className="h-px w-full bg-blue-500 border-dashed border-b border-blue-500" />
            </div>

            {/* The Turtle */}
            <motion.div
              animate={{ x: ['0%', '80%'] }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute top-1/2 -translate-y-1/2 text-2xl"
            >
              🐢
            </motion.div>

            {/* The Rabbit (Zooming past) */}
            <motion.div
              animate={{ x: ['-10%', '120%'] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatDelay: 0.5,
                ease: 'easeIn',
              }}
              className="absolute top-1/2 -translate-y-1/2 text-xl blur-[1px] opacity-50"
            >
              🐇
            </motion.div>
          </div>

          <p className="text-xs text-blue-200/50 leading-relaxed pt-2 border-t border-blue-500/20">{explanation}</p>
        </div>
      </div>
    </motion.div>
  );
}
