import { NextResponse } from 'next/server';
import firebase from '@/app/frontend/lib/firebaseClient';
import { db } from '@/app/frontend/lib/firebaseClient';

export async function POST(req: Request) {
  try {
    const { events } = await req.json();
    if (!events || !Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Backend Analytics Microservice Controller handling batch events
    for (const event of events) {
      const { eventName, eventData } = event;

      const globalRef = db.collection('global_analytics').doc('system_metrics');
      
      switch (eventName) {
        case 'USER_LOGIN':
          // Update global dailyActiveUsers
          const today = new Date().toISOString().split('T')[0];
          await globalRef.set({
            dailyActiveUsers: firebase.firestore.FieldValue.arrayUnion({
              date: today,
              userId: eventData.userId
            })
          }, { merge: true });
          break;

        case 'RIDE_COMPLETED':
          if (eventData.userId) {
            const userRef = db.collection('user_analytics').doc(eventData.userId);
            // using db.runTransaction or FieldValue.increment is ideal here due to concurrent writes
            await userRef.set({
              totalRides: firebase.firestore.FieldValue.increment(1),
              totalRideTime: firebase.firestore.FieldValue.increment(eventData.rideDuration || 0),
              totalMoneySpent: firebase.firestore.FieldValue.increment(eventData.cost || eventData.rideCost || 0)
            }, { merge: true });
          }
          
          const stationMapKey = `stationUsageMap.${eventData.stationId || 'unknown'}`;
          await globalRef.set({
            totalRides: firebase.firestore.FieldValue.increment(1),
            totalRevenue: firebase.firestore.FieldValue.increment(eventData.cost || eventData.rideCost || 0),
            totalRideDuration: firebase.firestore.FieldValue.increment(eventData.rideDuration || 0),
            [stationMapKey]: firebase.firestore.FieldValue.increment(1)
          }, { merge: true });
          break;

        case 'SESSION_ENDED':
        case 'SCREEN_TIME_LOGGED':
          if (eventData.userId) {
            const userRef = db.collection('user_analytics').doc(eventData.userId);
            await userRef.set({
              screenTime: firebase.firestore.FieldValue.increment(eventData.durationInSeconds || 0)
            }, { merge: true });
          }
          break;

        case 'API_REQUEST_COMPLETED':
          const rawEndpoint = eventData.endpoint || 'unknown';
          // Sanitize for Firestore dot notation (no /, ?, =, or .)
          const safeEndpoint = rawEndpoint.replace(/[^a-zA-Z0-9_ ]/g, '_').replace(/^_+/, '');
          
          const latency = eventData.responseTimeMs || eventData.latencyMs || 0;
          
          await globalRef.set({
            totalApiRequests: firebase.firestore.FieldValue.increment(1),
            totalApiResponseTime: firebase.firestore.FieldValue.increment(latency),
            apiMetrics: {
              [safeEndpoint]: {
                count: firebase.firestore.FieldValue.increment(1),
                totalTime: firebase.firestore.FieldValue.increment(latency)
              }
            }
          }, { merge: true });
          break;
          
        default:
          console.warn('Unknown event received in Analytics Microservice:', eventName);
          break;
      }
    }

    return NextResponse.json({ success: true, message: 'Analytics processed' }, { status: 200 });

  } catch (error) {
    console.error('Analytics Backend Error:', error);
    return NextResponse.json({ error: 'Internal server error while processing analytics' }, { status: 500 });
  }
}
