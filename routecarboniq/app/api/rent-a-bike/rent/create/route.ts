import { NextResponse } from "next/server";
import { db } from "@/app/frontend/lib/firebaseClient";
import { AnalyticsService } from "@/app/frontend/services/AnalyticsService";

const RENTALS_COLLECTION = "rentals";
const STATIONS_COLLECTION = "stations";

export async function POST(req: Request) {
  try {
    const input = await req.json();

    if (!input.userId) {
      return NextResponse.json(
        { error: "Authentication required to create a rental." },
        { status: 401 }
      );
    }

    const rentalRef = db.collection(RENTALS_COLLECTION).doc();
    const stationRef = db.collection(STATIONS_COLLECTION).doc(input.startStationId);

    const rental = {
      userKey: input.userKey,
      userId: input.userId,
      userEmail: input.userEmail,
      startStationId: input.startStationId,
      startStationName: input.startStationName,
      serviceFee: input.serviceFee,
      pricePerMinute: input.pricePerMinute,
      isOpen: true,
      status: "active",
    };

    const createdAt = new Date();
    const t0 = Date.now();

    await db.runTransaction(async (transaction: any) => {
      const stationSnapshot = await transaction.get(stationRef);
      if (!stationSnapshot.exists) {
        throw new Error("Start station not found.");
      }

      const stationData = stationSnapshot.data();
      const availableBikes = Number(stationData?.availableBikes ?? 0);
      const availableDocks = Number(stationData?.availableDocks ?? 0);

      if (availableBikes <= 0) {
        throw new Error("No bikes available at this station.");
      }

      transaction.set(rentalRef, rental);
      transaction.update(stationRef, {
        availableBikes: availableBikes - 1,
        availableDocks: availableDocks + 1,
        updatedAt: createdAt,
      });
    });

    // Fire AnalyticsEvent locally in API ?
    // In server environment we might just skip or hit the endpoint directly if needed, wait `AnalyticsService` singleton works in node
    AnalyticsService.getInstance().trackEvent("API_REQUEST_COMPLETED", {
      latencyMs: Date.now() - t0,
      endpoint: "Rent a bike",
      startStation: input.startStationName,
    });

    return NextResponse.json({ id: rentalRef.id, ...rental });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
