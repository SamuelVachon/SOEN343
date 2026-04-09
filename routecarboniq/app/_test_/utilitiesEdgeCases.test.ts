/**
 * stationMappers + timestampToMillis — additional edge-case tests
 *
 * Covers gaps not addressed by stationMappers.test.ts and
 * timestampToMillis.test.ts.
 */

// ─── Mocks required by rentalFlow imports ────────────────────────────────────

jest.mock("@/app/frontend/lib/firebaseClient", () => ({
  db: { collection: jest.fn() },
  default: {},
}));

jest.mock("@/app/frontend/services/AnalyticsService", () => ({
  AnalyticsService: { getInstance: () => ({ trackEvent: jest.fn() }) },
}));

import { mapFirestoreStationToUiStation } from "../frontend/pages/rent-a-bike/utils/stationMappers";
import { timestampToMillis } from "../frontend/pages/rent-a-bike/services/rentalFlow";
import type { FirestoreStation } from "../frontend/pages/rent-a-bike/services/rentalFlow";

// ─── mapFirestoreStationToUiStation — additional edge cases ───────────────────

describe("mapFirestoreStationToUiStation — additional edge cases", () => {
  const base: FirestoreStation = {
    id: "s1",
    name: "Milton / Parc",
    capacity: 19,
    lat: 45.5088,
    lon: -73.5878,
    availableBikes: 7,
    availableDocks: 12,
  };

  it("handles availableBikes greater than capacity without throwing", () => {
    const result = mapFirestoreStationToUiStation({
      ...base,
      availableBikes: 25,
      capacity: 19,
    });
    expect(result.num_bikes_available).toBe(25);
    expect(result.capacity).toBe(19);
  });

  it("preserves very large lat/lon values without truncation", () => {
    const result = mapFirestoreStationToUiStation({
      ...base,
      lat: 89.9999999,
      lon: -179.9999999,
    });
    expect(result.lat).toBe(89.9999999);
    expect(result.lon).toBe(-179.9999999);
  });

  it("handles a station with a very long name without truncation", () => {
    const longName = "A".repeat(300);
    const result = mapFirestoreStationToUiStation({ ...base, name: longName });
    expect(result.name).toBe(longName);
  });
});

// ─── timestampToMillis — additional edge cases ────────────────────────────────

describe("timestampToMillis — additional edge cases", () => {
  it("handles a Firestore Timestamp with both seconds and nanoseconds", () => {
    // Full serialized Firestore Timestamp shape — should use seconds * 1000
    const ts = { seconds: 1_000, nanoseconds: 500_000_000 };
    expect(timestampToMillis(ts)).toBe(1_000_000);
  });

  it("returns null for false (falsy boolean)", () => {
    expect(timestampToMillis(false)).toBeNull();
  });

  it("returns null for NaN — NaN is falsy so treated as absent", () => {
    // NaN is falsy: `if (!value) return null` catches it before the typeof check.
    expect(timestampToMillis(NaN)).toBeNull();
  });

  it("returns null for a plain object without toMillis or seconds", () => {
    expect(timestampToMillis({ foo: "bar" })).toBeNull();
  });

  it("returns null for a non-empty string", () => {
    expect(timestampToMillis("2026-04-08")).toBeNull();
  });

  it("returns the number directly for a positive integer timestamp", () => {
    expect(timestampToMillis(1_700_000_000_000)).toBe(1_700_000_000_000);
  });
});

// ─── subscribeToOpenRental — Firestore query structure ────────────────────────

describe("subscribeToOpenRental — query structure", () => {
  // We need a fresh mock for these tests so we can inspect .where() calls
  const mockWhere = jest.fn().mockReturnThis();
  const mockLimit = jest.fn().mockReturnThis();
  const mockOnSnapshot = jest.fn().mockReturnValue(jest.fn());

  beforeEach(() => {
    const { db } = require("@/app/frontend/lib/firebaseClient");
    (db.collection as jest.Mock).mockReturnValue({
      where: mockWhere,
      limit: mockLimit,
      onSnapshot: mockOnSnapshot,
    });
    jest.clearAllMocks();
    mockWhere.mockReturnThis();
    mockLimit.mockReturnThis();
    mockOnSnapshot.mockReturnValue(jest.fn());
  });

  it("applies a where clause for userId", () => {
    const { subscribeToOpenRental } = require("../frontend/pages/rent-a-bike/services/rentalFlow");
    subscribeToOpenRental("key1", "user1", jest.fn());
    const whereCalls: [string, string, unknown][] = mockWhere.mock.calls;
    const hasUserId = whereCalls.some(([field]) => field === "userId");
    expect(hasUserId).toBe(true);
  });

  it("applies a where clause for userKey", () => {
    const { subscribeToOpenRental } = require("../frontend/pages/rent-a-bike/services/rentalFlow");
    subscribeToOpenRental("key1", "user1", jest.fn());
    const whereCalls: [string, string, unknown][] = mockWhere.mock.calls;
    const hasUserKey = whereCalls.some(([field]) => field === "userKey");
    expect(hasUserKey).toBe(true);
  });

  it("applies a where clause filtering by isOpen == true", () => {
    const { subscribeToOpenRental } = require("../frontend/pages/rent-a-bike/services/rentalFlow");
    subscribeToOpenRental("key1", "user1", jest.fn());
    const whereCalls: [string, string, unknown][] = mockWhere.mock.calls;
    const hasIsOpen = whereCalls.some(
      ([field, , value]) => field === "isOpen" && value === true,
    );
    expect(hasIsOpen).toBe(true);
  });

  it("applies .limit(1) to the query", () => {
    const { subscribeToOpenRental } = require("../frontend/pages/rent-a-bike/services/rentalFlow");
    subscribeToOpenRental("key1", "user1", jest.fn());
    expect(mockLimit).toHaveBeenCalledWith(1);
  });
});
