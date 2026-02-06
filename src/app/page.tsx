'use client';

import { useTambo } from '@tambo-ai/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Components
import { ThemeToggle } from '@/components/ThemeToggle';
import { ActionButton } from '@/components/warroom/ActionButton';
import { ErrorGraph } from '@/components/warroom/ErrorGraph';
import { IncidentTimeline } from '@/components/warroom/IncidentTimeline';
import { LogStream } from '@/components/warroom/LogStream';
import { PostMortem } from '@/components/warroom/PostMortem';

import { ServiceHealth } from '@/components/warroom/ServiceHealth';
import { SlackDraft } from '@/components/warroom/SlackDraft';

// Server Actions
import { getSystemState, handleUserMessage } from '@/app/actions';
import { initiateRollback } from '@/lib/supabase';
import { ConnectDatabase } from '@/components/warroom/ConnectDatabase';
import { SchemaVisualizer } from '@/components/warroom/SchemaVisualizer';

// Types
import { IncidentAnalysis, WidgetConfig } from '@/lib/incident-analyzer';

type DashboardState = 'HEALTHY' | 'ALERT' | 'RECOVERY';

export default function DataGuardDashboard() {
  const router = useRouter();
  const { thread, sendThreadMessage } = useTambo();

  // Local UI State
  const [status, setStatus] = useState<DashboardState>('HEALTHY');
  const [incident, setIncident] = useState<IncidentAnalysis | null>(null);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  // DB Sync State
  const [services, setServices] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [thread?.messages]);

  // --- 1. Fetch Initial State & QuickStart Check ---
  useEffect(() => {
    const fetchState = async () => {
      try {
        const state = await getSystemState();
        setServices(state.services || []);
        setIncidents(state.incidents || []);

        // Determine Status based on DB
        const active = state.incidents.find((i: any) => i.status === 'active');
        if (active) {
          setIncident(mapDbToAnalysis(active));
          setStatus('ALERT');
        } else {
          setStatus('HEALTHY');
        }
      } catch (e) {
        console.error('Failed to fetch state', e);
      }
    };

    fetchState();
    // Poll for updates (quick hack for hackathon demo speed)
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, []);

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
      widgets: [
        { componentName: 'IncidentTimeline', reason: 'Default view' },
        { componentName: 'ServiceHealth', reason: 'Default view' },
      ],
      suggestedActions: [],
    };
  };

  // --- Handlers ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userQuery = input;
    setInput('');
    setIsAnalyzing(true);
    sendThreadMessage(userQuery);

    try {
      await handleUserMessage(userQuery);
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
  const [tempConfig, setTempConfig] = useState<any>(null);

  if (services.length === 0 && incidents.length === 0 && !isAnalyzing) {
    if (schemaData) {
      // Step 2: Schema Visualizer
      return (
        <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
          <SchemaVisualizer
            schema={schemaData}
            onConfirm={async (selectedTables) => {
              // 3. User Confirmed Monitoring
              // Fake the service creation
              setInput(
                `Connect to database ${tempConfig.url}. API_KEY:${tempConfig.key} TABLES:${selectedTables.join(',')}`,
              );
              // @ts-ignore
              handleSendMessage({ preventDefault: () => {} } as React.FormEvent);

              // Clear wizard state
              setSchemaData(null);
            }}
          />
        </div>
      );
    }

    // Step 1: Connect
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center gap-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Data Guard.
          </h1>
          <p className="text-xl text-neutral-400 max-w-xl mx-auto">
            Connect your Supabase database. <br />
            We monitor Transactions, Errors, and Latency in real-time.
          </p>
        </motion.div>

        {/* Option 2: Connect Database (Supabase) Only */}
        <ConnectDatabase
          onConnect={async (config) => {
            // 1. Verify connection using API Route
            try {
              const response = await fetch('/api/external-db/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: config.url, key: config.key }),
              });
              const res = await response.json();

              if (res.success && res.schema && res.schema.length > 0) {
                setTempConfig(config);
                setSchemaData(res.schema); // Move to Step 2
              } else if (res.success) {
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
                  setInput(`Connect to database ${config.url}. API_KEY:${config.key} TABLES:${tablesStr}`);
                  // @ts-ignore
                  handleSendMessage({ preventDefault: () => {} } as React.FormEvent);
                }
              } else {
                alert(`Connection Failed: ${res.error}`);
              }
            } catch (err: any) {
              alert(`Connection Error: ${err.message}`);
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
        {status === 'ALERT' && (
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

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b backdrop-blur-xl ${status === 'ALERT' ? 'bg-white/80 dark:bg-black/80 border-red-500/30' : 'bg-white/80 dark:bg-black/80 border-neutral-200 dark:border-white/10'}`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {status === 'ALERT' ? (
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </div>
                <span className="font-bold tracking-widest uppercase text-red-600 dark:text-red-500 text-sm">
                  INCIDENT ACTIVE
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <span className="text-white font-bold text-xs font-mono">DG</span>
                </div>
                <span className="font-bold text-neutral-900 dark:text-white tracking-tight">Data Guard</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="pt-28 pb-40 px-6 max-w-[1400px] mx-auto min-h-screen relative z-10">
        <AnimatePresence mode="wait">
          {status === 'HEALTHY' && (
            <motion.div
              key="healthy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] gap-12"
            >
              <ServiceHealth services={services} />
            </motion.div>
          )}

          {(status === 'ALERT' || status === 'RECOVERY') && incident && (
            <motion.div
              key="alert"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <div className="lg:col-span-8 flex flex-col gap-8">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <motion.div variants={itemVariants} className="h-full">
                    {getWidget('ErrorGraph') ? (
                      <ErrorGraph {...getWidget('ErrorGraph')?.props} />
                    ) : (
                      <ErrorGraph threshold={30} />
                    )}
                  </motion.div>
                  <motion.div variants={itemVariants} className="h-full">
                    {getWidget('LogStream') ? <LogStream {...getWidget('LogStream')?.props} /> : <LogStream />}
                  </motion.div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <motion.div variants={itemVariants}>
                    {getWidget('ActionButton') && (
                      <div onClick={() => handleActionComplete('rollback')}>
                        <ActionButton {...getWidget('ActionButton')?.props} />
                      </div>
                    )}
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    {getWidget('SlackDraft') && <SlackDraft {...getWidget('SlackDraft')?.props} />}
                  </motion.div>
                </div>
              </div>
              <motion.div variants={itemVariants} className="lg:col-span-4 h-full">
                <div className="sticky top-28 space-y-8">
                  {status === 'RECOVERY' && <PostMortem incidentId={incident?.type || 'INC-123'} />}
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
              className={`absolute -inset-0.5 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 ${status === 'ALERT' ? 'bg-red-500' : 'bg-emerald-500'}`}
            />
            <div className="relative flex items-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-full border border-neutral-200 dark:border-white/10 shadow-2xl transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={status === 'ALERT' ? 'Ask Data Guard AI...' : 'Describe system status...'}
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
                    className={`p-2 rounded-full ${status === 'ALERT' ? 'bg-red-500 text-white' : 'bg-black dark:bg-white text-white dark:text-black'}`}
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
