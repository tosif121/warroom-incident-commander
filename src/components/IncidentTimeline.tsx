'use client';

import { supabase } from '@/lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertOctagon, CheckCircle2, ChevronDown, ChevronUp, Clock, Play, User, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

type EventType =
  | 'detected'
  | 'activated'
  | 'action'
  | 'resolved'
  | 'info'
  | 'investigation'
  | 'action_taken'
  | 'recovered';

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: EventType;
  message: string;
  user?: string;
}

export function IncidentTimeline({
  incidentId = 'INC-2024-001',
  events: initialEvents = [],
}: {
  incidentId?: string;
  incidentId?: string;
  events?: TimelineEvent[];
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);

  useEffect(() => {
    if (initialEvents.length > 0) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  // Real-time Subscription (Multiplayer)
  useEffect(() => {
    const client = supabase;
    if (!client) return;

    // 1. Fetch initial history
    const fetchHistory = async () => {
      const { data } = await client.from('incident_events').select('*').order('created_at', { ascending: true });

      if (data) {
        setEvents((prev) => {
          if (data.length === 0) return prev;
          return data.map((d: any) => ({
            id: d.id,
            timestamp: new Date(d.created_at).toLocaleTimeString(),
            type: d.event_type as EventType,
            message: d.description,
            user: d.user_id || 'System',
          }));
        });
      }
    };
    fetchHistory();

    // 2. Subscribe to new events
    const channel = client
      .channel('active_incident')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incident_events',
        },
        (payload) => {
          const newEvent = payload.new;
          setEvents((prev) => [
            ...prev,
            {
              id: newEvent.id,
              timestamp: new Date(newEvent.created_at).toLocaleTimeString(),
              type: newEvent.event_type as EventType,
              message: newEvent.description,
              user: newEvent.user_id || 'System',
            },
          ]);
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [incidentId]);

  const getIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'detected':
        return <AlertOctagon className="w-4 h-4 text-white" />;
      case 'activated':
      case 'investigation':
        return <Zap className="w-4 h-4 text-white" />;
      case 'action':
      case 'action_taken':
        return <Play className="w-4 h-4 text-white" />;
      case 'resolved':
      case 'recovered':
        return <CheckCircle2 className="w-4 h-4 text-white" />;
      default:
        return <Clock className="w-4 h-4 text-white" />;
    }
  };

  const getColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'detected':
        return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
      case 'activated':
      case 'investigation':
        return 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
      case 'resolved':
      case 'recovered':
        return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
      case 'action':
      case 'action_taken':
        return 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
      default:
        return 'bg-neutral-500';
    }
  };

  return (
    <div className="w-full bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-6 py-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 shadow-inner">
            <Clock className="w-5 h-5 text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">Incident Timeline</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                LIVE SYNC • {events.length} EVENTS
              </p>
            </div>
          </div>
        </div>
        <button className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-500">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden bg-neutral-50/50 dark:bg-black/20"
          >
            <div className="p-6 relative">
              {/* Vertical Line */}
              <div className="absolute left-[47px] top-6 bottom-6 w-0.5 bg-neutral-200 dark:bg-neutral-800" />

              <div className="space-y-8">
                {events.map((event, idx) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative flex gap-6 group"
                  >
                    {/* Icon Bubble */}
                    <div
                      className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-neutral-900 transition-transform group-hover:scale-110 ${getColor(event.type)}`}
                    >
                      {getIcon(event.type)}
                    </div>

                    {/* Content Card */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {event.timestamp}
                        </span>
                        {event.user && (
                          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                            <User className="w-3 h-3" />
                            <span className="font-semibold">{event.user}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm group-hover:border-neutral-300 dark:group-hover:border-neutral-700 transition-colors">
                        <p
                          className={`text-sm leading-relaxed ${
                            event.type === 'detected'
                              ? 'font-bold text-red-600 dark:text-red-400'
                              : event.type === 'resolved' || event.type === 'recovered'
                                ? 'font-medium text-emerald-600 dark:text-emerald-400'
                                : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {event.message}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
