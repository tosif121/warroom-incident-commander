import { resolveIncident } from '@/lib/incident-detector';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { incidentId, resolution } = await request.json();

    if (!incidentId || !resolution) {
      return NextResponse.json({ success: false, error: 'Missing incidentId or resolution' }, { status: 400 });
    }

    const incident = await resolveIncident(incidentId, resolution);

    return NextResponse.json({
      success: true,
      incident,
      message: 'Incident resolved successfully',
      resolvedAt: incident.resolved_at,
      duration: incident.duration_seconds
        ? `${Math.floor(incident.duration_seconds / 60)}m ${incident.duration_seconds % 60}s`
        : null,
    });
  } catch (error: any) {
    console.error('Failed to resolve incident:', error);

    // Better error messages
    const statusCode =
      error.message === 'Incident not found' ? 404 : error.message === 'Incident already resolved' ? 409 : 500;

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to resolve incident',
      },
      { status: statusCode },
    );
  }
}
