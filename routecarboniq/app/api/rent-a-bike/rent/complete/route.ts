import { NextResponse } from "next/server";
import { dbAdmin } from "@/app/api/lib/firebaseAdmin";
import { AnalyticsService } from "@/app/frontend/services/AnalyticsService";
import { haversineDistance, calculateCarbonSaved } from "@/app/lib/carbonUtils";
import { getAuth } from "firebase-admin/auth";

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
    const rentalRef = dbAdmin.collection(RENTALS_COLLECTION).doc(input.rentalId);
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

    const destinationStationRef = dbAdmin.collection(STATIONS_COLLECTION).doc(input.returnStationId);
    const startStationRef = dbAdmin.collection(STATIONS_COLLECTION).doc(rental?.startStationId);
    const completeT0 = Date.now();

    let startStationData: any = null;
    let destinationStationData: any = null;

    await dbAdmin.runTransaction(async (transaction: any) => {
      const destinationSnapshot = await transaction.get(destinationStationRef);
      if (!destinationSnapshot.exists) {
        throw new Error("Return station not found.");
      }

      const startSnapshot = await transaction.get(startStationRef);
      if (startSnapshot.exists) {
        startStationData = startSnapshot.data();
      }

      destinationStationData = destinationSnapshot.data();
      const availableBikes = Number(destinationStationData?.availableBikes ?? 0);
      const availableDocks = Number(destinationStationData?.availableDocks ?? 0);

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

    let distanceKm = 0;
    let carbonSaved = 0;

    // Track carbon emissions from bike rental
    if (startStationData && destinationStationData && rental?.userId) {
      try {
        distanceKm = haversineDistance(
          startStationData.lat,
          startStationData.lon,
          destinationStationData.lat,
          destinationStationData.lon
        );
        carbonSaved = calculateCarbonSaved(distanceKm);
        
        await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/users/track-emission`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ carbonSaved, carbonEmitted: 0, userId: rental.userId }),
          }
        ).catch((err) => console.error("Failed to track emission:", err));
      } catch (err) {
        console.error("Error calculating emission:", err);
      }
    }

    return NextResponse.json({
      actualDurationMinutes,
      finalCharge,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      carbonSaved,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
