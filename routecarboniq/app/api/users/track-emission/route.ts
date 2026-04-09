import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { dbAdmin, admin } from '../../lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { carbonSaved, carbonEmitted, userId: bodyUserId } = await request.json();

    let userId: string;

    // Support both client calls (with ID token) and backend calls (with userId in body)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // Client call - verify ID token
      const token = authHeader.substring(7);
      const decodedToken = await getAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } else if (bodyUserId) {
      // Backend call - use userId from body (trusted server-to-server)
      userId = bodyUserId;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (carbonSaved === undefined || carbonEmitted === undefined) {
      return NextResponse.json(
        { error: 'Missing carbonSaved or carbonEmitted' },
        { status: 400 }
      );
    }

    // Update user document with incremented totals (create if doesn't exist)
    await dbAdmin.collection('users').doc(userId).set({
      totalCarbonSaved: admin.firestore.FieldValue.increment(carbonSaved),
      totalCarbonEmitted: admin.firestore.FieldValue.increment(carbonEmitted),
    }, { merge: true });

    // Update user_analytics document with incremented totals
    await dbAdmin.collection('user_analytics').doc(userId).set({
      totalCarbonSaved: admin.firestore.FieldValue.increment(carbonSaved),
      totalCarbonEmitted: admin.firestore.FieldValue.increment(carbonEmitted),
      updatedAt: new Date(),
    }, { merge: true });

    // Update global system metrics
    await dbAdmin.collection('system_metrics').doc('global').set({
      totalCarbonSaved: admin.firestore.FieldValue.increment(carbonSaved),
      totalCarbonEmitted: admin.firestore.FieldValue.increment(carbonEmitted),
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking emission:', error);
    return NextResponse.json({ error: 'Failed to track emission' }, { status: 500 });
  }
}
