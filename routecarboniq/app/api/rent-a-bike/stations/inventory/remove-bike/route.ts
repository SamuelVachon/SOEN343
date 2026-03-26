import { NextResponse } from "next/server";
import { db } from "@/app/frontend/lib/firebaseClient";

const STATIONS_COLLECTION = "stations";

async function updateStationBikeInventory(stationId: string, delta: 1 | -1) {
  const stationRef = db.collection(STATIONS_COLLECTION).doc(stationId);
  const updatedAt = new Date();

  return db.runTransaction(async (transaction: any) => {
    const stationSnapshot = await transaction.get(stationRef);
    if (!stationSnapshot.exists) {
      throw new Error("Station not found.");
    }

    const stationData = stationSnapshot.data();
    const availableBikes = Number(stationData?.availableBikes ?? 0);
    const availableDocks = Number(stationData?.availableDocks ?? 0);

    if (delta > 0 && availableDocks <= 0) {
      throw new Error("No docks are available to add another bike.");
    }

    if (delta < 0 && availableBikes <= 0) {
      throw new Error("No bikes are available to remove from this station.");
    }

    const nextAvailableBikes = availableBikes + delta;
    const nextAvailableDocks = availableDocks - delta;

    transaction.update(stationRef, {
      availableBikes: nextAvailableBikes,
      availableDocks: nextAvailableDocks,
      updatedAt,
    });

    return {
      availableBikes: nextAvailableBikes,
      availableDocks: nextAvailableDocks,
    };
  });
}

export async function POST(req: Request) {
  try {
    const { stationId } = await req.json();
    if (!stationId) {
      return NextResponse.json({ error: "stationId is required" }, { status: 400 });
    }

    const result = await updateStationBikeInventory(stationId, -1);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
