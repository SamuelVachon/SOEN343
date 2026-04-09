/**
 * timestampToMillis utility tests
 *
 * The function is exported from rentalFlow.ts which has Firebase imports,
 * so both firebaseClient and AnalyticsService are mocked to avoid side effects.
 */

jest.mock("@/app/frontend/lib/firebaseClient", () => ({
  db: { collection: jest.fn() },
  default: {},
}));

jest.mock("@/app/frontend/services/AnalyticsService", () => ({
  AnalyticsService: { getInstance: () => ({ trackEvent: jest.fn() }) },
}));

import { timestampToMillis } from "../frontend/pages/rent-a-bike/services/rentalFlow";

describe("timestampToMillis", () => {
  //  Falsy inputs 

  it("returns null for null", () => {
    expect(timestampToMillis(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(timestampToMillis(undefined)).toBeNull();
  });

  it("returns null for 0 (falsy number)", () => {
    // The function uses `if (!value) return null`, so 0 is treated as absent
    expect(timestampToMillis(0)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(timestampToMillis("")).toBeNull();
  });

  //  Numeric timestamp 

  it("returns the number directly for a positive epoch ms value", () => {
    expect(timestampToMillis(1_234_567_890_000)).toBe(1_234_567_890_000);
  });

  //  Date object 

  it("handles a native Date object", () => {
    const d = new Date("2026-04-08T12:00:00.000Z");
    expect(timestampToMillis(d)).toBe(d.getTime());
  });

  // ── Firestore Timestamp 

  it("handles a Firestore Timestamp-like object with toMillis()", () => {
    const firestoreTs = { toMillis: () => 9_999_999 };
    expect(timestampToMillis(firestoreTs)).toBe(9_999_999);
  });

  it("handles a raw { seconds } object (Firestore serialized form)", () => {
    expect(timestampToMillis({ seconds: 1_000 })).toBe(1_000_000);
  });

  //  Unrecognised shapes 

  it("returns null for an unrecognised plain object", () => {
    expect(timestampToMillis({ foo: "bar" })).toBeNull();
  });

  it("returns null for a non-empty string (not a recognised format)", () => {
    expect(timestampToMillis("2026-04-08")).toBeNull();
  });
});
