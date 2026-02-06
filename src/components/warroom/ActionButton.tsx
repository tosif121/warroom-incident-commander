'use client';

import { useTambo } from '@tambo-ai/react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Clock, Loader2, Play, RefreshCw, Server, ShieldAlert, Zap } from 'lucide-react';
import { useState } from 'react';

// --- Metadata Mapping ---
const ACTION_METADATA: Record<
  string,
  {
    label: string;
    description: string;
    risk: 'High' | 'Medium' | 'Low';
    time: string;
    icon: any;
  }
> = {
  rollback: {
    label: 'Emergency Rollback',
    description: 'Revert to last stable build. Restarts all pods.',
    risk: 'High',
    time: '2m 30s',
    icon: ShieldAlert,
  },
  restart: {
    label: 'Restart Services',
    description: 'Cycle payment-service pods to clear memory.',
    risk: 'Medium',
    time: '45s',
    icon: RefreshCw,
  },
  scale_up: {
    label: 'Scale Up Capacity',
    description: 'Add 5 new replicas to checkout-cluster.',
    risk: 'Low',
    time: '1m 15s',
    icon: Server,
  },
  monitor: {
    label: 'Active Monitoring',
    description: 'Enable verbose logging for 5m.',
    risk: 'Low',
    time: 'Instant',
    icon: Clock,
  },
};

function RiskButton({ actionKey }: { actionKey: string }) {
  const { sendThreadMessage } = useTambo();
  const [status, setStatus] = useState<'idle' | 'confirming' | 'loading' | 'success'>('idle');

  const meta = ACTION_METADATA[actionKey] || {
    label: actionKey,
    description: 'Execute action',
    risk: 'Low',
    time: 'Unknown',
    icon: Play,
  };
  const Icon = meta.icon;

  const handleExecute = async () => {
    setStatus('loading');

    // Execute real action if it's a rollback
    if (actionKey === 'rollback') {
      try {
        const response = await fetch('/api/incident/rollback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceName: 'payment-service' }), // Hardcoded for demo/simplicity
        });
        const result = await response.json();

        if (!result.success) {
          console.error(result.message);
          // Fail gracefully visually, or just pretend for demo flow if no incident
        }
      } catch (e) {
        console.error('Action failed', e);
      }
    } else {
      // Mock others
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setStatus('success');
    sendThreadMessage(`✅ Action Executed: ${meta.label}`);
    setTimeout(() => setStatus('idle'), 3000);
  };

  const riskStyles =
    meta.risk === 'High'
      ? 'hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/5'
      : meta.risk === 'Medium'
        ? 'hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-500/5'
        : 'hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/5';

  const badgeColor =
    meta.risk === 'High'
      ? 'bg-red-100 text-red-700 dark:bg-red-500 dark:text-white shadow-sm'
      : meta.risk === 'Medium'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-500 dark:text-black shadow-sm'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500 dark:text-white shadow-sm';

  return (
    <>
      <button
        onClick={() => setStatus('confirming')}
        disabled={status !== 'idle'}
        className={`group relative w-full flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-md transition-all duration-300 shadow-sm hover:shadow-md ${riskStyles} ${status === 'success' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : ''}`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 group-hover:scale-110 transition-transform duration-300 border border-neutral-200 dark:border-white/5`}
          >
            {status === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            ) : (
              <Icon
                className={`w-5 h-5 ${meta.risk === 'High' ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white'}`}
              />
            )}
          </div>
          <div className="text-left">
            <h4 className="font-bold text-neutral-900 dark:text-neutral-200 group-hover:text-black dark:group-hover:text-white transition-colors flex items-center gap-2">
              {meta.label}
              {status === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-400 mt-1">
              {status === 'success' ? 'Execution Confirmed' : meta.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
            {meta.risk} Risk
          </span>
          <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1 bg-neutral-100 dark:bg-black/20 px-2 py-0.5 rounded border border-neutral-200 dark:border-transparent">
            <Clock className="w-3 h-3" /> {meta.time}
          </span>
        </div>
      </button>

      {/* Modern Modal */}
      <AnimatePresence>
        {status === 'confirming' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStatus('idle')}
              className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0a0a0a] rounded-3xl border border-neutral-200 dark:border-white/10 shadow-2xl overflow-hidden"
            >
              {/* Red stripe for high risk */}
              {meta.risk === 'High' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
              )}

              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className={`p-4 rounded-full ${meta.risk === 'High' ? 'bg-red-50 text-red-500 dark:bg-red-500/10' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'}`}
                  >
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Confirm Execution</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">Target: {meta.label}</p>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/5 rounded-xl p-4 mb-8">
                  <p className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed">{meta.description}</p>
                  {meta.risk === 'High' && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg border border-red-100 dark:border-transparent">
                      <ShieldAlert className="w-4 h-4" />
                      WARNING: Production Impact Likely
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStatus('idle')}
                    className="flex-1 py-4 rounded-xl font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecute}
                    className={`flex-1 py-4 rounded-xl font-bold shadow-lg transition-transform active:scale-95 ${
                      meta.risk === 'High'
                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                        : 'bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200'
                    }`}
                  >
                    Authorize Execute
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export function ActionButton({ actions = ['rollback', 'monitor'] }: { actions?: string[] }) {
  return (
    <div className="w-full bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border border-neutral-200 dark:border-white/10 rounded-2xl p-6 shadow-xl">
      <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-6 flex items-center gap-2">
        <Zap className="w-4 h-4" />
        Recommended Actions
      </h3>
      <div className="flex flex-col gap-4">
        {actions.map((action) => (
          <RiskButton key={action} actionKey={action} />
        ))}
      </div>
    </div>
  );
}
