/**
 * @file tambo-config.ts
 * @description Central configuration file for Tambo components and tools
 *
 * This file registers the Data Guard components so the AI can use them.
 */

import { createIncident, getIncidents, getSystemLogs, incidentSchema, initiateRollback } from '@/lib/supabase';
import type { TamboComponent } from '@tambo-ai/react';
import { TamboTool } from '@tambo-ai/react';
import { z } from 'zod';

import { ActionButton } from '@/components/warroom/ActionButton';
import { ErrorGraph } from '@/components/warroom/ErrorGraph';
import { IncidentTimeline } from '@/components/warroom/IncidentTimeline';
import { LogStream } from '@/components/warroom/LogStream';
import { ServiceHealth } from '@/components/warroom/ServiceHealth';
import { SlackDraft } from '@/components/warroom/SlackDraft';

/**
 * tools
 * The AI uses these to interact with the system.
 */
export const tools: TamboTool[] = [
  {
    name: 'get_incidents',
    description: 'Get active incidents to show current system status.',
    tool: getIncidents,
    inputSchema: z.object({}),
    outputSchema: z.array(incidentSchema),
  },
  {
    name: 'report_incident',
    description: 'Report a new incident.',
    tool: createIncident,
    inputSchema: z.object({
      title: z.string(),
      severity: z.enum(['sev1', 'sev2', 'sev3']),
      status: z.enum(['active', 'investigating', 'resolved']),
      service_name: z.string(),
    }),
    outputSchema: incidentSchema,
  },
  {
    name: 'get_logs',
    description: 'Fetch real-time system logs for debugging.',
    tool: getSystemLogs,
    inputSchema: z.object({
      limit: z.number().optional(),
    }),
    outputSchema: z.array(
      z.object({
        id: z.string(),
        service: z.string(),
        level: z.enum(['ERROR', 'WARN', 'INFO']),
        message: z.string(),
        created_at: z.string(),
      }),
    ),
  },
  {
    name: 'rollback_service',
    description: 'Initiate a rollback for a service.',
    tool: initiateRollback,
    inputSchema: z.object({
      serviceName: z.string(),
    }),
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  {
    name: 'consult_dataguard',
    description: 'Analyze query to determine best Data Guard widgets.',
    tool: async ({ query }: { query: string }) => {
      const { analyzeIncident } = await import('./incident-analyzer');
      const analysis = await analyzeIncident(query);
      return {
        analysis: {
          detectedType: analysis.type,
          suggestedSeverity: analysis.severity,
          detectedService: analysis.service,
        },
        suggested_widgets: analysis.widgets,
      };
    },
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.object({
      analysis: z.object({
        detectedType: z.string(),
        suggestedSeverity: z.string(),
        detectedService: z.string().optional(),
      }),
      suggested_widgets: z.array(
        z.object({
          componentName: z.string(),
          props: z.record(z.any()).optional(),
          reason: z.string(),
        }),
      ),
    }),
  },
];

/**
 * components
 * The AI chooses which components to render based on the consult_warroom tool.
 */
export const components: TamboComponent[] = [
  {
    name: 'ErrorGraph',
    description: 'Shows error rate over time for a specific service.',
    component: ErrorGraph,
    propsSchema: z.object({
      title: z.string().optional(),
      color: z.string().optional(),
    }),
  },
  {
    name: 'LogStream',
    description: 'Displays real-time error logs for debugging.',
    component: LogStream,
    propsSchema: z.object({
      initialLogs: z.array(z.any()).optional(),
      serviceFilter: z.string().optional(),
    }),
  },
  {
    name: 'ActionButton',
    description: 'Executes incident response actions like rollback or scaling.',
    component: ActionButton,
    propsSchema: z.object({
      actions: z.array(z.string()).optional(),
    }),
  },
  {
    name: 'SlackDraft',
    description: 'Generates a pre-filled Slack message for team notification.',
    component: SlackDraft,
    propsSchema: z.object({
      channel: z.string().optional(),
      draftText: z.string().optional(),
    }),
  },
  {
    name: 'IncidentTimeline',
    description: 'Timeline of all incident events, persistence supported.',
    component: IncidentTimeline,
    propsSchema: z.object({
      incidentId: z.string().optional(),
      events: z.array(z.any()).optional(),
    }),
  },
  {
    name: 'ServiceHealth',
    description: 'Shows overall system health status.',
    component: ServiceHealth,
    propsSchema: z.object({
      services: z
        .array(
          z.object({
            name: z.string(),
            status: z.enum(['operational', 'degraded', 'outage']),
            latency: z.string(),
            errorRate: z.string(),
            uptime: z.string().optional(),
          }),
        )
        .optional(),
    }),
  },
];
