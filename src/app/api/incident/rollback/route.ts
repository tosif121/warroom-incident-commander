import { createServerClient } from '@/lib/supabase/server';
import { resolveIncident } from '@/lib/incident-detector';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { serviceName, simulate = true } = await request.json();

    if (!serviceName) {
      return NextResponse.json({ success: false, error: 'Missing serviceName' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1. Find service
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name')
      .eq('name', serviceName)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
    }

    // 2. Find ALL active incidents for this service
    const { data: incidents } = await supabase
      .from('incidents')
      .select('id, type, severity')
      .eq('status', 'active')
      .eq('service_id', service.id);

    if (!incidents || incidents.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active incidents to rollback.',
      });
    }

    const resolvedIncidents = [];

    // 3. Process each incident with rollback simulation
    for (const incident of incidents) {
      // Log: Initiating rollback
      await supabase.from('incident_events').insert([
        {
          incident_id: incident.id,
          event_type: 'action_taken',
          description: '🔄 Initiating emergency rollback...',
          user_id: 'api-rollback',
          metadata: {
            action: 'rollback',
            service: serviceName,
            timestamp: new Date().toISOString(),
          },
        },
      ]);

      if (simulate) {
        // Realistic delay for demo
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Log: Processing
        await supabase.from('incident_events').insert([
          {
            incident_id: incident.id,
            event_type: 'action_taken',
            description: '⏳ Rolling back deployment...',
          },
        ]);

        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Log: Complete
        await supabase.from('incident_events').insert([
          {
            incident_id: incident.id,
            event_type: 'action_taken',
            description: '✅ Rollback complete, service restarting',
          },
        ]);

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Resolve incident
      await resolveIncident(incident.id, `Emergency rollback successful for ${serviceName}`);

      resolvedIncidents.push(incident.id);
    }

    return NextResponse.json({
      success: true,
      message: `Rollback successful. Resolved ${resolvedIncidents.length} incident(s).`,
      resolvedIncidents,
      service: serviceName,
      duration: simulate ? '3.5s' : '0s',
    });
  } catch (error: any) {
    console.error('Rollback API failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Rollback failed',
      },
      { status: 500 },
    );
  }
}
