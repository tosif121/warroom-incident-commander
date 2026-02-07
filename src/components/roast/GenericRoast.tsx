'use client';

import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

interface GenericRoastProps {
  title: string;
  roast: string;
  explanation: string;
  severity: string;
  config?: {
    emoji?: string;
  };
}

export function GenericRoast({ title, roast, explanation, severity, config }: GenericRoastProps) {
  const emoji = config?.emoji || '🤡';

  const severityColors = {
    critical: 'border-red-500 bg-red-100 text-red-900 dark:bg-red-950/30 dark:text-red-400',
    high: 'border-orange-500 bg-orange-100 text-orange-900 dark:bg-orange-950/30 dark:text-orange-400',
    medium: 'border-yellow-500 bg-yellow-100 text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-400',
    low: 'border-green-500 bg-green-100 text-green-900 dark:bg-green-950/30 dark:text-green-400',
  };

  const colorClass = severityColors[severity as keyof typeof severityColors] || severityColors.medium;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative overflow-hidden rounded-xl border-l-4 p-6 backdrop-blur-sm ${colorClass} border-opacity-50 bg-opacity-30`}
    >
      <div className="flex items-start gap-4">
        <div className="text-4xl">{emoji}</div>

        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-bold uppercase tracking-tight opacity-90">{title}</h3>

          <p className="text-md font-medium italic opacity-100">"{roast}"</p>

          <p className="text-xs opacity-70 leading-relaxed pt-2 border-t border-black/10 dark:border-white/10">
            {explanation}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
