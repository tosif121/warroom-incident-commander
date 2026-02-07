'use client';

import { ThemeToggle } from '@/components/ThemeToggle';
import { useConnection } from '@/lib/context/ConnectionContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useState } from 'react';
import { PlayCircle, PauseCircle, RefreshCcw, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  isPaused: boolean;
  setIsPaused: (val: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (val: number) => void;
}

export function Header({ isPaused, setIsPaused, refreshInterval, setRefreshInterval }: HeaderProps) {
  const { isConnected, disconnect } = useConnection();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDisconnect = () => {
    setIsModalOpen(true);
  };

  const confirmDisconnect = () => {
    disconnect();
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b backdrop-blur-xl ${status === 'ALERT' ? 'bg-white/80 dark:bg-black/80 border-red-500/30' : 'bg-white/80 dark:bg-black/80 border-neutral-200 dark:border-white/10'}`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-white font-bold text-xs font-mono">DG</span>
            </div>
            <span className="font-bold text-neutral-900 dark:text-white tracking-tight">Data Guard</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Polling Controls - Moved to Right */}
          <div className="hidden md:flex items-center gap-4 mr-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border bg-white dark:bg-black/50 border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
                title={isPaused ? 'Resume Monitoring' : 'Pause Monitoring'}
              >
                {isPaused ? (
                  <PlayCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <PauseCircle className="h-4 w-4 text-amber-500" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs border-l pl-4 border-neutral-200 dark:border-white/10">
              <RefreshCcw
                className={`h-3.5 w-3.5 text-neutral-400 ${!isPaused ? 'animate-spin' : ''}`}
                style={{ animationDuration: '3s' }}
              />
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-transparent font-medium focus:outline-none cursor-pointer hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                {[2000, 5000, 10000, 30000].map((ms) => (
                  <option key={ms} value={ms} className="bg-white dark:bg-black text-black dark:text-white">
                    {ms / 1000}s
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isConnected && (
            <button
              onClick={handleDisconnect}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-red-500 text-white shadow hover:bg-red-500/90 h-9 px-3"
              title="Disconnect Database"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmDisconnect}
        title="Disconnect Database?"
        description="Are you sure you want to disconnect? This will stop all active monitoring and return you to the connection screen. Your API key will not be saved."
        confirmText="Disconnect"
        variant="danger"
      />
    </header>
  );
}
