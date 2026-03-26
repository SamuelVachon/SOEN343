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
  const res = await fetch("/api/rent-a-bike/stations/seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stations }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to seed stations");
  }
  const data = await res.json();
  return data.seeded;
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
  const res = await fetch("/api/rent-a-bike/rent/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to create rental");
  }
  return data satisfies RentalRecord;
}

export async function startRide(rentalId: string) {
  const res = await fetch("/api/rent-a-bike/rent/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rentalId }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to start ride");
  }
}

export async function completeRental(input: CompleteRentalInput) {
  const res = await fetch("/api/rent-a-bike/rent/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to complete rental");
  }
  return data;
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
