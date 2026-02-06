import { createServerClient } from '@/lib/supabase/server';

export type IncidentType = 'api_failure' | 'database_slow' | 'traffic_spike';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export async function detectIncident(userMessage: string) {
  const supabase = createServerClient();

  // === DATABASE CONNECTION HANDLER ===
  if (
    userMessage.toLowerCase().includes('connect') &&
    (userMessage.includes('http') || userMessage.includes('supabase'))
  ) {
    // Extract URL (multiple formats)
    const urlPatterns = [
      /database\s+(https?:\/\/[^\s]+)/i,
      /url[:\s]+(https?:\/\/[^\s]+)/i,
      /(https?:\/\/[a-zA-Z0-9-]+\.supabase\.co)/i,
    ];

    let url = null;
    for (const pattern of urlPatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        url = match[1];
        break;
      }
    }

    if (!url) {
      throw new Error(
        'Could not extract database URL. Format: "Connect to database https://xxx.supabase.co API_KEY:xxx"',
      );
    }

    // Extract API Key
    const keyPatterns = [/API_KEY:([^\s]+)/i, /key[:\s]+([a-zA-Z0-9._-]+)/i, /anon[:\s]+([a-zA-Z0-9._-]+)/i];

    let apiKey = null;
    for (const pattern of keyPatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        apiKey = match[1];
        break;
      }
    }

    // Extract tables (optional)
    const tablesMatch = userMessage.match(/TABLES:([^\s]+)/i);
    const monitoredTables = tablesMatch ? tablesMatch[1].split(',').filter((t) => t.length > 0) : [];

    const name = new URL(url).hostname;

    // === FETCH SCHEMA (Fixed Method) ===
    let schemaInfo: any = {};
    let schemaError = null;

    try {
      if (apiKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const externalDb = createClient(url, apiKey);

        // Get table list via PostgREST OpenAPI
        const response = await fetch(`${url}/rest/v1/`, {
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error('Invalid credentials or connection failed');
        }

        const apiSpec = await response.json();
        const tableNames = Object.keys(apiSpec.definitions || {}).filter((t) => !t.startsWith('_')); // Skip internal tables

        // Fetch sample row from each table to get columns
        for (const tableName of tableNames) {
          try {
            const { data: sample } = await externalDb.from(tableName).select('*').limit(1).single();

            if (sample) {
              schemaInfo[tableName] = Object.keys(sample).map((col) => ({
                name: col,
                type: typeof sample[col],
              }));
            }
          } catch (e) {
            console.warn(`Could not fetch schema for ${tableName}`);
          }
        }

        if (Object.keys(schemaInfo).length === 0) {
          schemaError = 'No accessible tables found';
        }
      } else {
        schemaError = 'No API key provided';
      }
    } catch (e: any) {
      console.error('Schema fetch error:', e);
      schemaError = e.message;
    }

    // === UPSERT SERVICE ===
    const { data: existing } = await supabase.from('services').select('id').eq('name', name).single();

    let serviceId = existing?.id;

    const serviceData = {
      name,
      connected_db_url: url,
      connected_db_key: apiKey,
      status: schemaError ? 'unknown' : 'healthy',
      monitored_tables: monitoredTables.length > 0 ? monitoredTables : Object.keys(schemaInfo),
      schema_info: schemaInfo,
    };

    if (existing) {
      await supabase.from('services').update(serviceData).eq('id', serviceId);
    } else {
      const { data: newService, error } = await supabase.from('services').insert([serviceData]).select('id').single();

      if (error) throw error;
      serviceId = newService.id;
    }

    // Create setup incident
    await supabase.from('incidents').insert([
      {
        service_id: serviceId,
        type: 'traffic_spike',
        severity: 'low',
        status: 'resolved',
        description: schemaError
          ? `Database connected with errors: ${schemaError}`
          : `Database connected: ${url}. Monitoring ${Object.keys(schemaInfo).length} tables.`,
        ui_config: {
          widgets: [{ componentName: 'ServiceHealth', reason: 'Monitoring Active' }],
          suggestedActions: schemaError ? ['Check API key permissions'] : [],
        },
      },
    ]);

    return { id: serviceId, type: 'DB_SETUP', schemaError } as any;
  }

  // === INCIDENT CREATION ===
  const { analyzeIncident } = await import('@/lib/incident-analyzer');
  const analysis = await analyzeIncident(userMessage);

  const type = analysis.type.toLowerCase() as IncidentType;
  const severity = analysis.severity.toLowerCase() as Severity;
  const serviceName = analysis.service || 'General Platform';

  const uiConfig = {
    widgets: analysis.widgets,
    suggestedActions: analysis.suggestedActions,
  };

  const simulatedData = (analysis as any).simulated_data;

  // === RESOLVE/CREATE SERVICE ===
  let { data: service } = await supabase.from('services').select('id').eq('name', serviceName).single();

  if (!service) {
    const { data: newService } = await supabase
      .from('services')
      .insert([
        {
          name: serviceName,
          status: severity === 'critical' ? 'down' : 'degraded',
        },
      ])
      .select('id')
      .single();
    service = newService;
  }

  if (!service) throw new Error('Could not resolve service');

  // === CHECK FOR DUPLICATE ACTIVE INCIDENT ===
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: recentIncident } = await supabase
    .from('incidents')
    .select('*')
    .eq('service_id', service.id)
    .eq('type', type)
    .eq('status', 'active')
    .gte('created_at', fiveMinutesAgo)
    .single();

  if (recentIncident) {
    console.log('Duplicate incident prevented, returning existing');
    return recentIncident;
  }

  // === CREATE NEW INCIDENT ===
  const { data: incident, error: incError } = await supabase
    .from('incidents')
    .insert([
      {
        service_id: service.id,
        type,
        severity,
        status: 'active',
        description: userMessage,
        ui_config: uiConfig,
      },
    ])
    .select()
    .single();

  if (incError) throw incError;

  // === UPDATE SERVICE STATUS ===
  const newStatus =
    severity === 'critical' || severity === 'high' ? 'down' : severity === 'medium' ? 'degraded' : 'healthy';

  await supabase.from('services').update({ status: newStatus }).eq('id', service.id);

  // === LOG INITIAL EVENT ===
  await supabase.from('incident_events').insert([
    {
      incident_id: incident.id,
      event_type: 'detected',
      description: `Incident detected via user report: "${userMessage}"`,
      user_id: 'system-monitor',
      metadata: { raw_message: userMessage },
    },
  ]);

  // === SEED SIMULATED DATA ===
  if (simulatedData) {
    const now = new Date();

    // Insert logs
    if (simulatedData.logs?.length > 0) {
      const logsToInsert = simulatedData.logs.map((l: any) => ({
        service_id: service.id,
        incident_id: incident.id,
        severity: l.severity,
        message: l.message,
      }));
      await supabase.from('error_logs').insert(logsToInsert);
    }

    // Insert metrics
    if (simulatedData.metrics?.length > 0) {
      const metricsToInsert = simulatedData.metrics.map((m: any, i: number) => ({
        service_id: service.id,
        incident_id: incident.id,
        metric_type: m.metric_type,
        value: m.value,
        timestamp: new Date(now.getTime() - (simulatedData.metrics.length - i) * 60000).toISOString(),
      }));
      await supabase.from('metrics').insert(metricsToInsert);
    }
  }

  return incident;
}

export async function resolveIncident(incidentId: string, resolutionMessage: string) {
  const supabase = createServerClient();

  // Check if already resolved
  const { data: existing } = await supabase
    .from('incidents')
    .select('status, service_id')
    .eq('id', incidentId)
    .single();

  if (!existing) throw new Error('Incident not found');
  if (existing.status === 'resolved') throw new Error('Incident already resolved');

  // Update incident
  const { data: incident, error } = await supabase
    .from('incidents')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolution_notes: resolutionMessage,
    })
    .eq('id', incidentId)
    .select()
    .single();

  if (error) throw error;

  // Log recovery event
  await supabase.from('incident_events').insert([
    {
      incident_id: incidentId,
      event_type: 'recovered',
      description: resolutionMessage,
      user_id: 'system-monitor',
    },
  ]);

  // Update service health
  if (incident.service_id) {
    await supabase.from('services').update({ status: 'healthy' }).eq('id', incident.service_id);
  }

  return incident;
}
