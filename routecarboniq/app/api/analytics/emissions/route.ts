import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { dbAdmin } from '../../lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    // Public endpoint - fetch from system_metrics collection
    const metricsDoc = await dbAdmin.collection('system_metrics').doc('global').get();

    if (!metricsDoc.exists) {
      return NextResponse.json({
        totalCarbonSaved: 0,
        totalCarbonEmitted: 0,
      });
    }

    const data = metricsDoc.data();

    if (!data) {
      return NextResponse.json({
        totalCarbonSaved: 0,
        totalCarbonEmitted: 0,
      });
    }

    return NextResponse.json({
      totalCarbonSaved: data.totalCarbonSaved || 0,
      totalCarbonEmitted: data.totalCarbonEmitted || 0,
      updatedAt: data.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching global emissions:', error);
    return NextResponse.json({ error: 'Failed to fetch emissions' }, { status: 500 });
  }
}
