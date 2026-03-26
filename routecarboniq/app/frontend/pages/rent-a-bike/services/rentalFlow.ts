import { db } from "../../../lib/firebaseClient";
import { AnalyticsService } from "../../../services/AnalyticsService";

const RENTALS_COLLECTION = "rentals";
const STATIONS_COLLECTION = "stations";

export type RentalStatus = "active" | "completed";

export interface RentalRecord {
  id: string;
  userKey: string;
  userId: string | null;
  userEmail: string | null;
  startStationId: string;
  startStationName: string;
  serviceFee: number;
  pricePerMinute: number;
  isOpen: boolean;
  status: RentalStatus;
  startedAt?: unknown;
  returnedAt?: unknown;
  returnStationId?: string | null;
  returnStationName?: string | null;
  actualDurationMinutes?: number;
  finalCharge?: number;
}

export interface FirestoreStation {
  id: string;
  name: string;
  capacity: number;
  lat?: number;
  lon?: number;
  availableBikes: number;
  availableDocks: number;
  updatedAt?: unknown;
}

interface SeedStationInput {
  station_id: string;
  name: string;
  capacity: number;
  lat?: number;
  lon?: number;
  num_bikes_available: number;
  num_docks_available: number;
}

interface CreateRentalInput {
  userKey: string;
  userId: string;
  userEmail: string | null;
  startStationId: string;
  startStationName: string;
  serviceFee: number;
  pricePerMinute: number;
}

interface CompleteRentalInput {
  rentalId: string;
  returnStationId: string;
  returnStationName: string;
}

export function subscribeToStations(
  callback: (stations: FirestoreStation[]) => void,
) {
  return db.collection(STATIONS_COLLECTION).onSnapshot((snapshot) => {
    const next = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<FirestoreStation, "id">),
    }));

    callback(next);
  });
}

export async function seedStationsIfEmpty(stations: SeedStationInput[]) {
  const existing = await db.collection(STATIONS_COLLECTION).limit(1).get();
  if (!existing.empty) {
    return false;
  }

  const batch = db.batch();
  const seededAt = new Date();

  stations.forEach((station) => {
    const ref = db.collection(STATIONS_COLLECTION).doc(station.station_id);
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
  return true;
}

export function subscribeToOpenRental(
  userKey: string,
  userId: string,
  callback: (rental: RentalRecord | null) => void,
) {
  return db
    .collection(RENTALS_COLLECTION)
    .where("userId", "==", userId)
    .where("userKey", "==", userKey)
    .where("isOpen", "==", true)
    .limit(1)
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          callback(null);
          return;
        }

        const doc = snapshot.docs[0];
        callback({ id: doc.id, ...(doc.data() as Omit<RentalRecord, "id">) });
      },
      (_error) => {
        // permission-denied: treat as no open rental
        callback(null);
      },
    );
}

export async function createRental(input: CreateRentalInput) {
  if (!input.userId) {
    throw new Error("Authentication required to create a rental.");
  }

  const rentalRef = db.collection(RENTALS_COLLECTION).doc();
  const stationRef = db
    .collection(STATIONS_COLLECTION)
    .doc(input.startStationId);

  const rental: Omit<RentalRecord, "id"> = {
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
  await db.runTransaction(async (transaction) => {
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
  AnalyticsService.getInstance().trackEvent("API_REQUEST_COMPLETED", {
    latencyMs: Date.now() - t0,
    endpoint: "Firebase DB Write",
  });

  return {
    id: rentalRef.id,
    ...rental,
  } satisfies RentalRecord;
}

export async function startRide(rentalId: string) {
  const rentalRef = db.collection(RENTALS_COLLECTION).doc(rentalId);
  await rentalRef.update({
    startedAt: new Date(),
  });
}

export async function completeRental(input: CompleteRentalInput) {
  const rentalRef = db.collection(RENTALS_COLLECTION).doc(input.rentalId);
  const snapshot = await rentalRef.get();

  if (!snapshot.exists) {
    throw new Error("Rental not found.");
  }

  const rental = snapshot.data() as RentalRecord;
  const returnTime = new Date();
  const startedAtMillis =
    timestampToMillis(rental.startedAt) ?? returnTime.getTime();
  const actualDurationMinutes = Math.max(
    1,
    Math.ceil((returnTime.getTime() - startedAtMillis) / 60_000),
  );
  const finalCharge = Number(
    (rental.serviceFee + actualDurationMinutes * rental.pricePerMinute).toFixed(
      2,
    ),
  );

  const destinationStationRef = db
    .collection(STATIONS_COLLECTION)
    .doc(input.returnStationId);

  const completeT0 = Date.now();
  await db.runTransaction(async (transaction) => {
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
    endpoint: "Firebase DB Transaction",
  });

  return {
    actualDurationMinutes,
    finalCharge,
  };
}

export function timestampToMillis(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "object" && value !== null) {
    if ("toMillis" in value && typeof value.toMillis === "function") {
      return value.toMillis();
    }

    if ("seconds" in value && typeof value.seconds === "number") {
      return value.seconds * 1000;
    }
  }

  return null;
}
