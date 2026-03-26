import { NextResponse } from 'next/server';
import { db } from '@/app/frontend/lib/firebaseClient';

export const dynamic = 'force-dynamic'; // Prevent caching so we get live data

export async function GET() {
  try {
    const globalRef = db.collection('global_analytics').doc('system_metrics');
    const doc = await globalRef.get();

    if (!doc.exists) {
      // Return default values if the system hasn't tracked events yet
      return NextResponse.json({
        totalRides: 0,
        totalRevenue: 0,
        dailyActiveUsers: [],
        stationUsageMap: {},
        totalRideDuration: 0,
        totalApiRequests: 0,
        totalApiResponseTime: 0
      }, { status: 200 });
    }

    const data = doc.data() || {};

    // Optionally calculate dynamic fields like average ride duration
    const apiMetricsProcessed: Record<string, number> = {};
    
    // Check for nested properly formatted metrics
    if (data.apiMetrics) {
      for (const endpoint in data.apiMetrics) {
        const stats = data.apiMetrics[endpoint];
        if (stats && stats.count > 0) {
          apiMetricsProcessed[endpoint] = Math.round(stats.totalTime / stats.count);
        }
      }
    }

    // Also check for any 'flat' keys caused by previous dot-notation bug in set()
    Object.keys(data).forEach(key => {
      if (key.startsWith('apiMetrics.')) {
        // e.g. "apiMetrics.firebase_db_write.count"
        const parts = key.split('.');
        if (parts.length === 3) {
          const endpoint = parts[1];
          const statType = parts[2]; // count or totalTime
          
          if (!apiMetricsProcessed[endpoint]) {
             // Let's just find BOTH keys directly
             const c = data[`apiMetrics.${endpoint}.count`] || 0;
             const t = data[`apiMetrics.${endpoint}.totalTime`] || 0;
             if (c > 0) {
               apiMetricsProcessed[endpoint] = Math.round(t / c);
             }
          }
        }
      }
    });

    const finalData = {
      ...data,
      averageRideDuration: data.totalRides > 0 
        ? Math.round((data.totalRideDuration || 0) / data.totalRides) 
        : 0,
      apiResponseTimeAverage: data.totalApiRequests > 0
        ? Math.round((data.totalApiResponseTime || 0) / data.totalApiRequests)
        : 0,
      apiEndpointAverages: apiMetricsProcessed
    };

    return NextResponse.json(finalData, { status: 200 });

  } catch (error) {
    console.error('Error fetching global analytics:', error);
    return NextResponse.json({ error: 'Internal server error while fetching global analytics' }, { status: 500 });
  }
}
