import { NextResponse } from "next/server";
import { db } from "@/app/frontend/lib/firebaseClient";
import { AnalyticsService } from "@/app/frontend/services/AnalyticsService";

const RENTALS_COLLECTION = "rentals";
const STATIONS_COLLECTION = "stations";

function timestampToMillis(value: any) {
  if (!value) return null;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && value !== null) {
    if ("toMillis" in value && typeof value.toMillis === "function") return value.toMillis();
    if ("seconds" in value && typeof value.seconds === "number") return value.seconds * 1000;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const input = await req.json();
    const rentalRef = db.collection(RENTALS_COLLECTION).doc(input.rentalId);
    const snapshot = await rentalRef.get();

    if (!snapshot.exists) {
      throw new Error("Rental not found.");
    }

    const rental = snapshot.data();
    const returnTime = new Date();
    const startedAtMillis = timestampToMillis(rental?.startedAt) ?? returnTime.getTime();
    const actualDurationMinutes = Math.max(
      1,
      Math.ceil((returnTime.getTime() - startedAtMillis) / 60_000)
    );
    const finalCharge = Number(
      ((rental?.serviceFee ?? 0) + actualDurationMinutes * (rental?.pricePerMinute ?? 0)).toFixed(2)
    );

    const destinationStationRef = db.collection(STATIONS_COLLECTION).doc(input.returnStationId);
    const completeT0 = Date.now();

    await db.runTransaction(async (transaction: any) => {
      const destinationSnapshot = await transaction.get(destinationStationRef);
      if (!destinationSnapshot.exists) {
        throw new Error("Return station not found.");
      }

      const destinationData = destinationSnapshot.data();
      const availableBikes = Number(destinationData?.availableBikes ?? 0);
      const availableDocks = Number(destinationData?.availableDocks ?? 0);

      transaction.update(rentalRef, {
        isOpen: false,
        status: "completed",
        returnStationId: input.returnStationId,
        returnStationName: input.returnStationName,
        returnedAt: returnTime,
        actualDurationMinutes,
        finalCharge,
      });

      transaction.update(destinationStationRef, {
        availableBikes: availableBikes + 1,
        availableDocks: Math.max(0, availableDocks - 1),
        updatedAt: returnTime,
      });
    });

    AnalyticsService.getInstance().trackEvent("API_REQUEST_COMPLETED", {
      latencyMs: Date.now() - completeT0,
      endpoint: "Return a bike Check-out",
    });

    return NextResponse.json({
      actualDurationMinutes,
      finalCharge,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
