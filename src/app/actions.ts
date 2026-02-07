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

export async function sendSlackNotification(text: string, channel: string = '#general') {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('⚠️ No SLACK_WEBHOOK_URL configured. Simulating send.');
    // Simulate success if no webhook is present (fallback for demo)
    return { success: true, simulated: true };
  }

  console.log(`📡 Sending to Slack Webhook: ${webhookUrl.substring(0, 40)}...`);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        channel, // Override default channel
        username: 'Data Guard AI',
        icon_emoji: ':shield:',
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack API Error: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    return { success: false, error: 'Failed to send message' };
  }
}
