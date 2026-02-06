'use server';

import { detectIncident, resolveIncident } from '@/lib/incident-detector';
import { createServerClient } from '@/lib/supabase/server';

export async function submitUserQuery(query: string) {
  try {
    const incident = await detectIncident(query);
    return { success: true, incident };
  } catch (error) {
    console.error('Failed to detect incident:', error);
    return { success: false, error: 'Failed to process query' };
  }
}

export async function handleUserMessage(message: string) {
  try {
    const incident = await detectIncident(message);
    return { success: true, incident };
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export async function getSystemState() {
  const supabase = createServerClient();

  const { data: incidents } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });

  const { data: services } = await supabase.from('services').select('*').order('name');

  return {
    incidents: incidents || [],
    services: services || [],
  };
}

// ... existing imports
import { createClient } from '@supabase/supabase-js';

// ... monitorExternalTable ...
