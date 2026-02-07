import { motion } from 'framer-motion';
import { CheckCircle2, Lightbulb } from 'lucide-react';

interface FixSuggestionProps {
  title: string;
  steps: string[];
}

export default function FixSuggestion({ title, steps = [] }: FixSuggestionProps) {
  return (
    <div className="w-full bg-indigo-900/20 rounded-xl border border-indigo-500/30 overflow-hidden my-4">
      <div className="bg-indigo-900/40 px-4 py-3 flex items-center gap-2 border-b border-indigo-500/30">
        <Lightbulb className="w-5 h-5 text-yellow-400" />
        <h4 className="font-bold text-indigo-100">{title}</h4>
      </div>

      <div className="p-4 space-y-3">
        {steps.map((step, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-start gap-3 group"
          >
            <div className="mt-0.5 min-w-[20px]">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 group-hover:text-green-400 transition-colors" />
            </div>
            <p className="text-sm text-indigo-200 group-hover:text-white transition-colors">{step}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
