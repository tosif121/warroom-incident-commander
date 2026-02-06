// --- Types ---

export type IncidentType = 'API_FAILURE' | 'DATABASE_SLOW' | 'TRAFFIC_SPIKE' | 'SECURITY_BREACH' | 'UNKNOWN';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type WidgetConfig = {
  componentName: 'LogStream' | 'ErrorGraph' | 'ServiceHealth' | 'ActionButton' | 'IncidentTimeline' | 'SlackDraft';
  props?: Record<string, any>;
  reason: string;
};

export type IncidentAnalysis = {
  type: IncidentType;
  service: string | undefined;
  severity: Severity;
  widgets: WidgetConfig[];
  suggestedActions: string[];
};

// --- Logic ---

// --- Logic ---

async function analyzeIncidentRegex(userMessage: string): Promise<IncidentAnalysis> {
  const lowerMsg = userMessage.toLowerCase();

  // 1. Determine Incident Type
  let type: IncidentType = 'UNKNOWN';
  if (/500 error|failing|down|status code|5xx/.test(lowerMsg)) {
    type = 'API_FAILURE';
  } else if (/slow|timeout|latency|queries|stuck/.test(lowerMsg)) {
    type = 'DATABASE_SLOW';
  } else if (/traffic|spike|overload|capacity|limit/.test(lowerMsg)) {
    type = 'TRAFFIC_SPIKE';
  } else if (/security|breach|ddos|attack|hacker/.test(lowerMsg)) {
    type = 'SECURITY_BREACH';
  }

  // 2. Identify Service
  let service = undefined;
  if (/payment|checkout|stripe/.test(lowerMsg)) service = 'payment-service';
  else if (/auth|login|user|session/.test(lowerMsg)) service = 'auth-service';
  else if (/db|database|postgres|sql/.test(lowerMsg)) service = 'postgres-primary';
  else if (/frontend|ui|web|cdn/.test(lowerMsg)) service = 'frontend-cdn';

  // 3. Determine Severity
  let severity: Severity = 'MEDIUM';
  if (/critical|down|outage|all users/.test(lowerMsg)) severity = 'CRITICAL';
  else if (/intermittent|some users|high/.test(lowerMsg)) severity = 'HIGH';
  else if (/low|minor|warning/.test(lowerMsg)) severity = 'LOW';

  // 4. Map to Widgets
  const widgets: WidgetConfig[] = [];
  const actions: string[] = [];

  // Always show Timeline & Health
  widgets.push({
    componentName: 'IncidentTimeline',
    reason: 'Show event history',
  });
  widgets.push({
    componentName: 'ServiceHealth',
    reason: 'Show overall system status',
  });

  switch (type) {
    case 'API_FAILURE':
      widgets.push({
        componentName: 'ErrorGraph',
        props: { title: 'Error Rate (5xx)', color: '#ef4444' },
        reason: 'Visualize error spike',
      });
      if (service) {
        widgets.push({
          componentName: 'LogStream',
          props: { serviceFilter: service },
          reason: `Show logs for ${service}`,
        });
      }
      actions.push('rollback', 'restart');
      widgets.push({
        componentName: 'SlackDraft',
        props: {
          draftText: `🚨 *API FAILURE DETECTED*\nService: ${service || 'Unknown'}\nSeverity: ${severity}\nInvestigating 500 errors.`,
        },
        reason: 'Draft incident alert',
      });
      break;

    case 'DATABASE_SLOW':
      widgets.push({
        componentName: 'ErrorGraph',
        props: { title: 'Query Latency (ms)', color: '#eab308' }, // Yellow
        reason: 'Visualize latency',
      });
      if (service) {
        widgets.push({
          componentName: 'LogStream',
          props: { serviceFilter: service },
          reason: 'Show slow query logs',
        });
      }
      actions.push('enable_cache', 'restart');
      widgets.push({
        componentName: 'SlackDraft',
        props: {
          draftText: `⚠️ *DATABASE ISSUES*\nService: ${service || 'DB'}\nSeverity: ${severity}\nHigh latency detected in read replicas.`,
        },
        reason: 'Draft latency alert',
      });
      break;

    case 'TRAFFIC_SPIKE':
      widgets.push({
        componentName: 'ErrorGraph',
        props: { title: 'Requests/sec', color: '#3b82f6' }, // Blue
        reason: 'Visualize traffic volume',
      });
      actions.push('scale_up', 'enable_cache');
      widgets.push({
        componentName: 'SlackDraft',
        props: {
          draftText: `📈 *TRAFFIC SURGE*\nService: ${service || 'Gateway'}\nSeverity: ${severity}\nAuto-scaling trigger imminent.`,
        },
        reason: 'Draft scaling alert',
      });
      break;

    case 'SECURITY_BREACH':
      widgets.push({
        componentName: 'ErrorGraph',
        props: { title: 'Blocked Requests', color: '#a855f7' }, // Purple
        reason: 'Show blocked malicious traffic',
      });
      widgets.push({
        componentName: 'LogStream',
        props: { serviceFilter: 'firewall' },
        reason: 'Show security audit logs',
      });
      actions.push('monitor', 'restart');
      widgets.push({
        componentName: 'SlackDraft',
        props: {
          channel: '#sec-ops',
          draftText: `🛡️ *SECURITY ALERT*\nSuspicious activity detected.\nSeverity: ${severity}`,
        },
        reason: 'Notify SecOps',
      });
      break;
  }

  // Add ActionButton if we found actions
  if (actions.length > 0) {
    widgets.push({
      componentName: 'ActionButton',
      props: { actions },
      reason: 'Suggested remediation actions',
    });
  }

  return {
    type,
    service,
    severity,
    widgets,
    suggestedActions: actions,
  };
}

export async function analyzeIncident(userMessage: string): Promise<IncidentAnalysis> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    console.warn('No Perplexity API Key provided. Using regex fallback.');
    return analyzeIncidentRegex(userMessage);
  }

  // --- 1. Live Probe Check (Real Data Integration) ---
  let probeContext = '';
  // Simple regex to find a URL (http/https)
  const urlMatch = userMessage.match(/(https?:\/\/[^\s]+)/);

  if (urlMatch) {
    const url = urlMatch[0];
    try {
      console.log(`🚀 Probing Live URL: ${url}`);
      const startTime = Date.now();
      const probeRes = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Data-Guard/1.0' },
        signal: AbortSignal.timeout(5000), // 5s timeout
      });
      const duration = Date.now() - startTime;
      const body = await probeRes.text();

      probeContext = `
--- LIVE PROBE RESULTS ---
Target: ${url}
Status: ${probeRes.status} ${probeRes.statusText}
Latency: ${duration}ms
Response Body (first 500 chars): ${body.substring(0, 500)}
--------------------------
INSTRUCTION: The user provided a User-Agent URL. Use the REAL data above to determine the incident.
If Status is 200, it might be a false alarm or "Recovery Detected".
If Status is 4xx/5xx, use this to generate the Incident Type, Title, and Logs.
Use the Latency value for the metrics.
`;
    } catch (err: any) {
      probeContext = `
--- LIVE PROBE FAILED ---
Target: ${url}
Error: ${err.message}
-------------------------
INSTRUCTION: The probe failed (Network Error / Timeout). Treat this as a "DOWN" or "UNREACHABLE" incident.
`;
    }
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are an advanced SRE Incident Commander AI for Data Guard.
Analyze the reported incident and return a JSON object describing the situation and the best UI widgets to manage it.

Allowed Components:
- ErrorGraph (props: title, color)
- LogStream (props: serviceFilter)
- ActionButton (props: actions=[rollback, restart, scale_up, enable_cache, block_ip])
- SlackDraft (props: draftText, channel)

Timeline and ServiceHealth are always included automatically, do not include them.

JSON Schema:
{
  "type": "API_FAILURE" | "DATABASE_SLOW" | "TRAFFIC_SPIKE" | "SECURITY_BREACH" | "UNKNOWN",
  "service": string (e.g. "payment-service"),
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "widgets": [ { "componentName": string, "props": object, "reason": string } ],
  "suggestedActions": string[]
}

Return ONLY raw JSON. No markdown formatting.`,
          },
          {
            role: 'user',
            content: `Incident Report: "${userMessage}"\n${probeContext}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content;

    // Clean code blocks if present
    const jsonStr = rawContent.replace(/```json|```/g, '').trim();
    const result = JSON.parse(jsonStr);

    // Ensure mandatory base widgets are present (just in case AI forgot, though we define them in UI usually)
    // Actually, logic below adds them if missing, but let's trust the UI config logic primarily
    // We merge base widgets:
    const baseWidgets: WidgetConfig[] = [
      { componentName: 'IncidentTimeline', reason: 'Show event history' },
      { componentName: 'ServiceHealth', reason: 'Show overall system status' },
    ];

    return {
      type: result.type || 'UNKNOWN',
      service: result.service,
      severity: result.severity || 'MEDIUM',
      widgets: [...baseWidgets, ...(result.widgets || [])],
      suggestedActions: result.suggestedActions || [],
    };
  } catch (error) {
    console.error('AI Analysis Failed:', error);
    return analyzeIncidentRegex(userMessage);
  }
}

// --- Legacy Adapters (for compatibility with existing code if needed) ---
// We can remove these if we update tambo.ts to use analyzeIncident directly.
export async function analyzeIntent(query: string) {
  const analysis = await analyzeIncident(query);
  return {
    detectedType: analysis.type,
    suggestedSeverity: analysis.severity,
    detectedService: analysis.service,
    // We'll attach the full analysis to context if needed, but for now map fields
    _fullAnalysis: analysis,
  };
}

export function getWidgetSuggestions(context: any) {
  return context._fullAnalysis.widgets;
}
