'use client';

import { useTambo } from '@tambo-ai/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Components
import { ActionButton } from '@/components/ActionButton';
import { ErrorGraph } from '@/components/ErrorGraph';
import { IncidentTimeline } from '@/components/IncidentTimeline';
import { LogStream } from '@/components/LogStream';
import { SlackDraft } from '@/components/SlackDraft';

// Server Actions
import { getSystemState, handleUserMessage } from '@/app/actions';
import { initiateRollback } from '@/lib/supabase';
import { ConnectDatabase } from '@/components/ConnectDatabase';
import { SchemaVisualizer } from '@/components/SchemaVisualizer';
import { reliableFetch } from '@/lib/api';
import { useConnection } from '@/lib/context/ConnectionContext';
import { Header } from '@/components/Header';

import { useLiveMonitor } from '@/lib/hooks/useLiveMonitor';

// Types
import { IncidentAnalysis, WidgetConfig } from '@/lib/incident-analyzer';

export default function DataGuardDashboard() {
  const router = useRouter();
  const { thread, sendThreadMessage } = useTambo();
  const { setConnectionState } = useConnection();

  // Local UI State
  const [incident, setIncident] = useState<IncidentAnalysis | null>(null);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  // DB Sync State
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialServices, setInitialServices] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);

  // Polling State
  const [isPollingPaused, setIsPollingPaused] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(3000);

  const isIncidentMode = !!incident;

  // LIVE MONITORING
  const { services, metricHistory } = useLiveMonitor(initialServices, pollingInterval, isPollingPaused);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {};
  useEffect(() => {
    scrollToBottom();
  }, [thread?.messages]);

  // Sync Global Connection State
  useEffect(() => {
    if (services.length > 0) {
      setConnectionState(true, services[0].id || null);
    } else {
      setConnectionState(false, null);
    }
  }, [services, setConnectionState]);

  // --- 1. Fetch Initial State & QuickStart Check ---
  useEffect(() => {
    const fetchState = async () => {
      try {
        const state = await getSystemState();
        setInitialServices(state.services || []);
        setIncidents(state.incidents || []);

        // Determine Status based on DB
        const active = state.incidents.find((i: any) => i.status === 'active');
        if (active) {
          setIncident(mapDbToAnalysis(active));
        } else {
          // Default to Monitoring Mode if no active incident
          setIncident({
            type: 'MONITORING',
            severity: 'LOW',
            service: 'System Operational',
            widgets: [
              { componentName: 'ErrorGraph', reason: 'Live metrics' },
              { componentName: 'LogStream', reason: 'Live logs' },
              { componentName: 'IncidentTimeline', reason: 'History' },
            ],
            suggestedActions: [],
          });
        }
      } catch (e) {
        console.error('Failed to fetch state', e);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchState();
    fetchState();

    if (isPollingPaused) return;

    // Poll for updates (respecting header controls)
    const interval = setInterval(fetchState, pollingInterval);
    return () => clearInterval(interval);
  }, [isPollingPaused, pollingInterval]);

  // Helper to map DB incident to UI Analysis object
  const mapDbToAnalysis = (dbIncident: any): IncidentAnalysis => {
    if (dbIncident.ui_config) {
      return {
        type: dbIncident.type,
        severity: dbIncident.severity?.toUpperCase() || 'HIGH',
        service: dbIncident.service_name || 'Unknown Service',
        widgets: dbIncident.ui_config.widgets || [],
        suggestedActions: dbIncident.ui_config.suggestedActions || [],
      };
    }
    return {
      type: dbIncident.type || 'UNKNOWN',
      severity: (dbIncident.severity?.toUpperCase() as any) || 'HIGH',
      service: dbIncident.service_name || 'Unknown Service',
      widgets: [{ componentName: 'IncidentTimeline', reason: 'Default view' }],
      suggestedActions: [],
    };
  };

  // --- Handlers ---
  const handleSendMessage = async (e: React.FormEvent, messageOverride?: string) => {
    e.preventDefault();
    const query = messageOverride || input;
    if (!query.trim()) return;

    if (!messageOverride) setInput('');
    setIsAnalyzing(true);
    sendThreadMessage(query);

    try {
      await handleUserMessage(query);
      // No manual state update - relying on poll/refresh
    } catch (err) {
      console.error('AI Analysis Failed', err);
      sendThreadMessage('⚠️ Error analyzing input. Check console.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleActionComplete = async (action: string) => {
    setEvents((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        type: 'action',
        message: `Executed remediation: ${action}`,
        user: 'User',
      },
    ]);

    if (action === 'rollback') {
      const res = await initiateRollback('payment-service');
      if (res.success) sendThreadMessage('✅ Rollback initiated successfully.');
      else sendThreadMessage(`❌ Rollback failed: ${res.message}`);
    }
  };

  const getWidget = (name: string): WidgetConfig | undefined => {
    return incident?.widgets.find((w) => w.componentName === name);
  };

  // --- ZERO TO ONE: ONBOARDING ---

  // Local state for the onboarding wizard
  const [schemaData, setSchemaData] = useState<any[] | null>(null);
  const [skippedTables, setSkippedTables] = useState<any[]>([]);
  const [tempConfig, setTempConfig] = useState<any>(null);

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 animate-pulse" />
          <p className="text-neutral-500 dark:text-neutral-400 font-mono text-xs animate-pulse tracking-widest uppercase">
            Initializing Data Guard...
          </p>
        </div>
      </div>
    );
  }

  if (services.length === 0 && incidents.length === 0 && !isAnalyzing) {
    if (schemaData) {
      return (
        <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white p-6 flex flex-col items-center justify-center">
          <SchemaVisualizer
            schema={schemaData}
            skippedTables={skippedTables}
            onCancel={() => {
              setSchemaData(null);
              setSkippedTables([]);
            }}
            onConfirm={async (selectedTables) => {
              // 3. User Confirmed Monitoring
              const connectionMessage = `Connect to database ${tempConfig.url}. API_KEY:${tempConfig.key} TABLES:${selectedTables.join(',')}`;

              // @ts-ignore
              handleSendMessage({ preventDefault: () => {} } as React.FormEvent, connectionMessage);

              // Clear wizard state
              setSchemaData(null);
              toast.success('Configuration saved. Starting monitoring...');
            }}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white p-6 flex flex-col items-center justify-center gap-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Data Guard
          </h1>
          <p className="text-xl text-neutral-400 max-w-xl mx-auto">
            Connect your Supabase database. <br />
            We monitor Transactions, Errors, and Latency in real-time.
          </p>
        </motion.div>

        {/* Option 2: Connect Database (Supabase) Only */}
        <ConnectDatabase
          initialUrl={tempConfig?.url}
          initialKey={tempConfig?.key}
          onConnect={async (config) => {
            // 1. Verify connection using API Route
            try {
              const loadingToast = toast.loading('Connecting to Database...');
              const {
                success,
                data: res,
                error,
              } = await reliableFetch('/external-db/check', {
                method: 'POST',
                data: { url: config.url, key: config.key },
              });

              toast.dismiss(loadingToast);

              if (success && res?.success) {
                toast.success('Credentials Verified! Select tables to monitor.');
                if (res.schema && (res.schema.length > 0 || (res.skippedTables && res.skippedTables.length > 0))) {
                  setTempConfig(config);
                  setSchemaData(res.schema || []);
                  setSkippedTables(res.skippedTables || []); // Move to Step 2
                } else {
                  // Fallback: 0 tables found (likely permissions)
                  const manualTables = prompt(
                    'Could not auto-detect tables (permissions). \nEnter table names to monitor (comma separated):',
                    'orders, users',
                  );

                  if (manualTables) {
                    const tablesStr = manualTables
                      .split(',')
                      .map((t) => t.trim())
                      .join(',');
                    const manualMessage = `Connect to database ${config.url}. API_KEY:${config.key} TABLES:${tablesStr}`;
                    // @ts-ignore
                    handleSendMessage({ preventDefault: () => {} } as React.FormEvent, manualMessage);
                  }
                }
              } else {
                toast.error(`Connection Failed: ${res?.error || error}`);
              }
            } catch (err: any) {
              toast.error(`Connection Error: ${err.message}`);
            }
          }}
        />
      </div>
    );
  }

  // --- ANIMATIONS ---
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
    exit: { opacity: 0, scale: 0.95 },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] transition-colors duration-1000 selection:bg-emerald-500/30">
      <AnimatePresence>
        {isIncidentMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-0"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
          </motion.div>
        )}
      </AnimatePresence>

      <Header
        isPaused={isPollingPaused}
        setIsPaused={setIsPollingPaused}
        refreshInterval={pollingInterval}
        setRefreshInterval={setPollingInterval}
      />

      <main className="pt-28 pb-40 px-6 max-w-[1400px] mx-auto min-h-screen relative z-10">
        <AnimatePresence mode="wait">
          {incident && (
            <motion.div
              key="alert" // Key should maybe change if type changes?
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <div className="lg:col-span-8 flex flex-col gap-8">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <motion.div variants={itemVariants} className="h-full">
                    {/* Always show graph if we have metrics */}
                    <ErrorGraph threshold={30} data={metricHistory} />
                  </motion.div>
                  <motion.div variants={itemVariants} className="h-full">
                    <LogStream />
                  </motion.div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <motion.div variants={itemVariants}>
                    <div onClick={() => handleActionComplete('rollback')}>
                      <ActionButton
                        title="Initiate Rollback"
                        description="Revert to last stable version"
                        actionId="rollback"
                      />
                    </div>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <SlackDraft />
                  </motion.div>
                </div>
              </div>
              <motion.div variants={itemVariants} className="lg:col-span-4 h-full">
                <div className="sticky top-28 space-y-8">
                  <IncidentTimeline events={events} incidentId={'INC-2024-001'} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="fixed bottom-8 left-0 right-0 px-6 z-40 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <form onSubmit={handleSendMessage} className="relative group perspective-[1000px]">
            <div
              className={`absolute -inset-0.5 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 ${isIncidentMode ? 'bg-red-500' : 'bg-emerald-500'}`}
            />
            <div className="relative flex items-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-full border border-neutral-200 dark:border-white/10 shadow-2xl transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isIncidentMode ? 'Ask Data Guard AI...' : 'Describe system status...'}
                className="flex-1 px-6 py-4 bg-transparent outline-none text-neutral-900 dark:text-white placeholder:text-neutral-500 text-sm font-medium"
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={!input.trim() || isAnalyzing}
                className="p-2 mr-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <Sparkles className="w-5 h-5 animate-spin text-purple-500" />
                ) : (
                  <div
                    className={`p-2 rounded-full ${isIncidentMode ? 'bg-red-500 text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}
                  >
                    <Send className="w-4 h-4" />
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
