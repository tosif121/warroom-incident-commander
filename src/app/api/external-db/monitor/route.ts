import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url, key, tables = ['orders'] } = await request.json();

    if (!url || !key) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 });
    }

    const supabase = createClient(url, key);
    const start = Date.now();

    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    let severity: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const issues: string[] = [];
    let failedCount = 0;
    let errorCount = 0;
    let baselineFailures = 0;

    // CHECK 1: Failed Transactions
    const transactionTable = tables.find(
      (t: string) => t.includes('order') || t.includes('payment') || t.includes('transaction'),
    );

    if (transactionTable) {
      try {
        // Current failed count
        const { count: failed } = await supabase
          .from(transactionTable)
          .select('*', { count: 'exact', head: true })
          .eq('status', 'failed')
          .gte('created_at', fiveMinsAgo);

        failedCount = failed || 0;

        // Baseline for comparison
        const { count: baseline } = await supabase
          .from(transactionTable)
          .select('*', { count: 'exact', head: true })
          .eq('status', 'failed')
          .gte('created_at', oneHourAgo)
          .lt('created_at', fiveMinsAgo);

        baselineFailures = Math.max(1, (baseline || 0) / 11); // Avoid divide by zero

        // Analyze severity
        if (failedCount > baselineFailures * 5) {
          severity = 'critical';
          issues.push(`🔴 Failed transactions spiked ${Math.round(failedCount / baselineFailures)}x above baseline`);
        } else if (failedCount > baselineFailures * 2) {
          severity = 'degraded';
          issues.push(`🟡 Failed transactions elevated: ${failedCount} (baseline: ${Math.round(baselineFailures)})`);
        } else if (failedCount > 0) {
          issues.push(`⚠️ ${failedCount} failed transactions (within normal range)`);
        }
      } catch (error: any) {
        console.warn('Transaction check failed:', error.message);
        issues.push(`⚠️ Could not check ${transactionTable} (missing 'status' or 'created_at' column?)`);
      }
    }

    // CHECK 2: Error Logs
    const errorTable = tables.find((t: string) => t.includes('log') || t.includes('error'));

    if (errorTable) {
      try {
        const { count } = await supabase
          .from(errorTable)
          .select('*', { count: 'exact', head: true })
          .gte('created_at', fiveMinsAgo);

        errorCount = count || 0;

        if (errorCount > 100) {
          severity = 'critical';
          issues.push(`🔴 Error rate critical: ${errorCount} errors in 5 minutes`);
        } else if (errorCount > 20) {
          if (severity === 'healthy') severity = 'degraded';
          issues.push(`🟡 Elevated error rate: ${errorCount} errors`);
        } else if (errorCount > 0) {
          issues.push(`📋 ${errorCount} errors logged (normal activity)`);
        }
      } catch (error: any) {
        console.warn('Error log check failed:', error.message);
      }
    }

    // CHECK 3: Latency
    const latency = Date.now() - start;

    if (latency > 5000) {
      severity = 'critical';
      issues.push(`🔴 CRITICAL: Database latency ${latency}ms`);
    } else if (latency > 2000) {
      if (severity === 'healthy') severity = 'degraded';
      issues.push(`🟡 Slow response: ${latency}ms`);
    }

    // Default healthy message
    if (issues.length === 0) {
      issues.push('✅ All systems operational');
    }

    return NextResponse.json({
      success: true,
      status: severity,
      latency,

      metrics: {
        failedTransactions: failedCount,
        baselineFailures: Math.round(baselineFailures),
        recentErrors: errorCount,
        responseTime: latency,
        timestamp: new Date().toISOString(),
      },

      issues,

      checked: {
        tables,
        timeWindow: '5 minutes',
        baseline: '1 hour',
      },
    });
  } catch (error: any) {
    console.error('Monitoring Error:', error);
    return NextResponse.json(
      {
        success: false,
        status: 'critical',
        latency: 0,
        issues: [error.message || 'Monitoring failed'],
        metrics: {
          failedTransactions: 0,
          baselineFailures: 0,
          recentErrors: 0,
          responseTime: 0,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
