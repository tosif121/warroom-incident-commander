import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// --- Types ---

export type Incident = {
  id: string;
  type: string; // was title/type
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'resolving' | 'resolved';
  description: string; // was service_name in some places, but schema has description
  started_at: string; // was detected_at
  service_id?: string;
  // Join fields usually
  services?: { name: string };
};

export type SystemLog = {
  id: string;
  service_id: string;
  severity: 'error' | 'warn' | 'info';
  message: string;
  created_at: string;
};

export const incidentSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.enum(['active', 'resolving', 'resolved']),
  description: z.string(),
  started_at: z.string().optional(),
});

// --- Client Setup ---

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// --- Helper Functions (Data Guard) ---

export async function getIncidents() {
  if (!supabase) {
    console.warn('Supabase not configured.');
    return [] as Incident[];
  }

  const { data, error } = await supabase
    .from('incidents')
    .select(
      `
      *,
      services ( name )
    `,
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching incidents:', JSON.stringify(error, null, 2));
    return [];
  }
  // Flatten service name if needed, or handle in UI
  return data.map((d: any) => ({
    ...d,
    service_name: d.services?.name || 'Unknown Service',
    started_at: d.created_at, // Map created_at to started_at for frontend compatibility
  })) as (Incident & { service_name: string })[];
}

export async function getSystemLogs(limit = 20) {
  if (!supabase) return [] as SystemLog[];

  const { data, error } = await supabase
    .from('error_logs') // Correct table name
    .select(
      `
      *,
      services ( name )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];

  // Map for easier UI consumption
  return data.map((d: any) => ({
    ...d,
    service: d.services?.name || 'Unknown',
    level: d.severity.toUpperCase(), // map db 'error' to UI 'ERROR'
  })) as any[];
}

export async function createIncident(incident: Omit<Incident, 'id' | 'started_at'>) {
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase.from('incidents').insert([incident]).select().single();
  if (error) throw error;
  return data as Incident;
}

export async function initiateRollback(serviceName: string) {
  if (!supabase) return { success: false, message: 'Client not initialized' };

  // 1. Find active incident for this service (simplified logic)
  const { data: incidents } = await supabase.from('incidents').select('id').eq('status', 'active').limit(1);

  if (incidents && incidents.length > 0) {
    const incidentId = incidents[0].id;
    // 2. Call the RPC to resolve it
    const { error } = await supabase.rpc('resolve_incident', {
      incident_uuid: incidentId,
    });
    if (error) {
      console.error('Rollback failed:', error);
      return { success: false, message: 'Rollback failed: ' + error.message };
    }
    return {
      success: true,
      message: 'Rollback successful. Service recovering.',
    };
  }

  return { success: false, message: 'No active incidents to rollback.' };
}

// --- Realtime Subscriptions ---

import { RealtimeChannel } from '@supabase/supabase-js';

let activeChannels: RealtimeChannel[] = [];

export function subscribeToIncidents(callback: (payload: any) => void) {
  if (!supabase) return;

  const channel = supabase
    .channel('incidents-all')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'incidents',
      },
      callback,
    )
    .subscribe();

  activeChannels.push(channel);
  return channel;
}

export function subscribeToLogs(serviceId: string | undefined, callback: (payload: any) => void) {
  if (!supabase) return;

  // If serviceId is provided, filter by it (client-side filtering might be needed if row-level filter not simple)
  // But Supabase allows filter: 'service_id=eq.UUID'
  const filter = serviceId ? `service_id=eq.${serviceId}` : undefined;

  const channel = supabase
    .channel(`logs-${serviceId || 'all'}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'error_logs',
        filter: filter,
      },
      callback,
    )
    .subscribe();

  activeChannels.push(channel);
  return channel;
}

export function subscribeToMetrics(serviceId: string | undefined, callback: (payload: any) => void) {
  if (!supabase) return;

  const filter = serviceId ? `service_id=eq.${serviceId}` : undefined;

  const channel = supabase
    .channel(`metrics-${serviceId || 'all'}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'metrics',
        filter: filter,
      },
      callback,
    )
    .subscribe();

  activeChannels.push(channel);
  return channel;
}

export function unsubscribeAll() {
  if (!supabase) return;

  activeChannels.forEach((channel) => {
    supabase?.removeChannel(channel);
  });
  activeChannels = [];
}
