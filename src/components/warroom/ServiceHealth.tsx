'use client';

import { motion } from 'framer-motion';
import { Activity, CheckCircle2, Globe, Server, ShieldCheck, Signal, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
type ServiceStatus = 'operational' | 'degraded' | 'outage';

export interface Service {
  name: string;
  status: ServiceStatus;
  latency: string;
  errorRate: string;
  uptime: string;
}

export function ServiceHealth({ services: initialServices = [] }: { services?: Service[] }) {
  const [services, setServices] = useState<Service[]>(initialServices);

  useEffect(() => {
    // If initial services provided (e.g. from server component), use them.
    // Otherwise fetch from client.
    if (initialServices.length > 0) {
      setServices(initialServices);
      return;
    }

    const fetchServices = async () => {
      const { supabase } = await import('@/lib/supabase');
      // const { monitorExternalTable } = await import('@/app/actions'); // Removed

      if (!supabase) return;

      const { data } = await supabase.from('services').select('*').order('name');

      if (data) {
        // Parallel Live Health Check: URL or DB
        const servicesWithHealth = await Promise.all(
          data.map(async (s: any) => {
            let status = s.status;
            let latency = s.response_time_ms;

            // Scenario A: External Supabase DB
            if (s.connected_db_key && s.connected_db_url) {
              try {
                const response = await fetch('/api/external-db/monitor', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    url: s.connected_db_url,
                    key: s.connected_db_key,
                    tables: s.monitored_tables || [],
                  }),
                });
                const health = await response.json();

                if (health.success && health.status === 'healthy') {
                  status = 'healthy';
                  latency = health.latency;
                } else {
                  status = 'down'; // or use health.status
                  latency = health.latency || 0;

                  // Auto-Trigger Logic
                  if (s.status === 'healthy' || s.status === 'unknown') {
                    const errorMsg = `CRITICAL DB ALERT: ${s.name} (External Supabase) has spikes. Error: ${health.errorContext}`;
                    console.log('Triggering DB Incident:', errorMsg);
                    import('@/app/actions').then(({ submitUserQuery }) => submitUserQuery(errorMsg));
                  }
                }
              } catch (err) {
                console.error('Monitor failed', err);
                status = 'degraded';
              }
            }
            // Fallback: If simply existing in DB but not "External Monitor" configured (e.g. self)
            // We just use the stored status

            return {
              name: s.name,
              status: (status === 'healthy'
                ? 'operational'
                : status === 'down'
                  ? 'outage'
                  : 'degraded') as ServiceStatus,
              latency: latency + 'ms',
              errorRate: '0.00%',
              uptime: s.uptime_percent + '%',
              isMonitored: !!s.connected_db_url,
              isDb: !!s.connected_db_key,
              monitored_url: s.connected_db_url, // For buttons below
              api_key: s.connected_db_key, // For buttons below
            };
          }),
        );
        setServices(servicesWithHealth);
      }
    };

    fetchServices();
    const interval = setInterval(fetchServices, 5000);
    return () => clearInterval(interval);
  }, [initialServices]);

  const allHealthy = services.every((s) => s.status === 'operational');

  return (
    <div className="w-full">
      {/* Hero Status */}
      <div className="text-center mb-12 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-500 px-5 py-2 rounded-full mb-6 backdrop-blur-sm shadow-[0_0_15px_rgba(16,185,129,0.15)]"
        >
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <span className="text-xs font-bold tracking-widest uppercase">All Systems Nominal</span>
        </motion.div>

        <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-neutral-900 to-neutral-500 dark:from-white dark:to-neutral-500 tracking-tight">
          System Operational
        </h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((service, idx) => (
          <motion.div
            key={service.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative overflow-hidden bg-white/50 dark:bg-white/5 backdrop-blur-md border border-neutral-200 dark:border-white/10 rounded-2xl p-5 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
          >
            {/* Subtle Gradient Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-neutral-100 dark:bg-white/10 rounded-xl text-neutral-600 dark:text-neutral-300 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
                  {service.name.includes('DB') || service.name.includes('Database') ? (
                    <Server className="w-5 h-5" />
                  ) : service.name.includes('CDN') ? (
                    <Globe className="w-5 h-5" />
                  ) : service.name.includes('Auth') ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                </div>
                {/* Disconnect Button (Only if it's external DB or Monitored) */}
                {(service as any).isDb && (
                  <>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Disconnect Database?')) {
                          await fetch('/api/services/disconnect', { method: 'POST' });
                          window.location.reload();
                        }
                      }}
                      className="p-1.5 hover:bg-red-500/10 text-neutral-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Disconnect Database"
                    >
                      <Zap className="w-4 h-4 rotate-45" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>ONLINE</span>
              </div>
            </div>

            <h3 className="relative z-10 font-bold text-neutral-900 dark:text-white mb-6 text-lg">{service.name}</h3>

            <div className="relative z-10 grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100 dark:border-white/5">
              <div>
                <p className="text-[10px] uppercase text-neutral-500 font-semibold mb-1">Latency</p>
                <div className="flex items-center gap-1.5 text-neutral-900 dark:text-white font-mono text-sm">
                  <Signal className="w-3 h-3 text-neutral-400" />
                  {service.latency}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-neutral-500 font-semibold mb-1">Uptime</p>
                <div className="flex items-center justify-end gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-sm font-bold">
                  <Activity className="w-3 h-3" />
                  {service.uptime}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
