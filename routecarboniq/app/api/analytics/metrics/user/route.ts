import { NextResponse } from 'next/server';
import { db } from '@/app/frontend/lib/firebaseClient';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const userRef = db.collection('user_analytics').doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      // Return default values if the user hasn't generated any analytics yet
      return NextResponse.json({
        totalRides: 0,
        totalRideTime: 0,
        screenTime: 0,
        totalMoneySpent: 0
      }, { status: 200 });
    }

    return NextResponse.json(doc.data(), { status: 200 });

  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return NextResponse.json({ error: 'Internal server error while fetching user analytics' }, { status: 500 });
  }
}
