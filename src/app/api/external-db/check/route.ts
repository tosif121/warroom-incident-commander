import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url, key } = await request.json();

    if (!url || !key) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 });
    }

    const supabase = createClient(url, key);

    // Get tables via PostgREST OpenAPI spec
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials or connection failed',
        },
        { status: 401 },
      );
    }

    const apiSpec = await response.json();
    const tableNames = Object.keys(apiSpec.definitions || {});

    console.log('✅ Found tables:', tableNames);

    const schema = [];
    const skippedTables = [];

    for (const tableName of tableNames) {
      // Skip internal tables
      if (tableName.startsWith('_')) continue;

      try {
        // Get sample row (limit 1)
        const { data: sampleRows, error: sampleError } = await supabase.from(tableName).select('*').limit(1);

        // Skip if no access
        if (sampleError) {
          skippedTables.push({ name: tableName, reason: sampleError.message });
          continue;
        }

        const sample = sampleRows?.[0];

        // Get row count
        const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });

        // Extract columns with better type detection
        const columns = sample
          ? Object.keys(sample).map((col) => ({
              name: col,
              type: detectType(sample[col]),
            }))
          : [];

        schema.push({
          name: tableName,
          rowCount: count || 0,
          columns,
          recommendations: analyzeColumns(columns, tableName),
        });
      } catch (tableError: any) {
        console.warn(`⚠️ Error processing ${tableName}:`, tableError.message);
        skippedTables.push({ name: tableName, reason: tableError.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Connected! Found ${schema.length} accessible tables.`,
      schema,
      skippedTables: skippedTables.length > 0 ? skippedTables : undefined,
    });
  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Connection failed',
      },
      { status: 500 },
    );
  }
}

// Better type detection
function detectType(value: any): string {
  if (value === null || value === undefined) return 'nullable';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'numeric';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'json';

  // String type checks
  if (typeof value === 'string') {
    if (value.match(/^\d{4}-\d{2}-\d{2}T/)) return 'timestamp';
    if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return 'uuid';
    if (value.match(/^\d+$/)) return 'text'; // numeric string
  }

  return 'text';
}

// Smarter recommendations
function analyzeColumns(columns: any[], tableName: string) {
  const recommendations = [];
  const names = columns.map((c) => c.name.toLowerCase());

  // Check table name patterns
  if (tableName.includes('order') || tableName.includes('transaction')) {
    recommendations.push('💰 Monitor transaction failures');
  }
  if (tableName.includes('error') || tableName.includes('log')) {
    recommendations.push('📋 Stream error logs');
  }
  if (tableName.includes('user') || tableName.includes('account')) {
    recommendations.push('👥 Track user activity');
  }

  // Check column patterns
  if (names.includes('status')) {
    recommendations.push('⚠️ Monitor failed records (status column detected)');
  }
  if (names.some((n) => n.includes('error') || n.includes('message'))) {
    recommendations.push('🔍 Track error messages');
  }
  if (names.some((n) => n.includes('time') || n.includes('duration') || n.includes('latency'))) {
    recommendations.push('⏱️ Monitor performance metrics');
  }
  if (names.includes('created_at') || names.includes('updated_at')) {
    recommendations.push('📊 Track activity rate over time');
  }

  return recommendations.length > 0 ? recommendations : ['📦 General monitoring available'];
}
