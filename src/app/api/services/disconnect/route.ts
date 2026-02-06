// app/api/services/disconnect/route.ts

import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { serviceId } = await request.json();

    if (!serviceId) {
      return NextResponse.json({ success: false, error: 'Missing serviceId' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1. Check if service exists
    const { data: service, error: fetchError } = await supabase
      .from('services')
      .select('id, name')
      .eq('id', serviceId)
      .single();

    if (fetchError || !service) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
    }

    // 2. Resolve any active incidents first
    const { data: activeIncidents } = await supabase
      .from('incidents')
      .select('id')
      .eq('service_id', serviceId)
      .eq('status', 'active');

    if (activeIncidents && activeIncidents.length > 0) {
      for (const incident of activeIncidents) {
        await supabase
          .from('incidents')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolution_notes: 'Service disconnected',
          })
          .eq('id', incident.id);
      }
    }

    // 3. Delete the service (cascade will handle related data)
    const { error: deleteError } = await supabase.from('services').delete().eq('id', serviceId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: `Service "${service.name}" disconnected successfully`,
    });
  } catch (error: any) {
    console.error('Disconnect failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to disconnect service' },
      { status: 500 },
    );
  }
}
