import { NextResponse } from "next/server";
import { dbAdmin } from "@/app/api/lib/firebaseAdmin";

const STATIONS_COLLECTION = "stations";

export async function POST(req: Request) {
  try {
    const { stations } = await req.json();

    const existing = await dbAdmin.collection(STATIONS_COLLECTION).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ seeded: false, message: "Already seeded" });
    }

    const batch = dbAdmin.batch();
    const seededAt = new Date();

    stations.forEach((station: any) => {
      const ref = dbAdmin.collection(STATIONS_COLLECTION).doc(station.station_id);
      batch.set(ref, {
        name: station.name,
        capacity: station.capacity,
        lat: station.lat ?? null,
        lon: station.lon ?? null,
        availableBikes: station.num_bikes_available,
        availableDocks: station.num_docks_available,
        updatedAt: seededAt,
      });
    });

    await batch.commit();
    return NextResponse.json({ seeded: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
