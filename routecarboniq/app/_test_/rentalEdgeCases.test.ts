/**
 * rent/create and rent/complete — missing edge-case tests
 *
 * Covers gaps not addressed by the existing createRental.test.ts
 * and completeRental.test.ts files.
 */

// ─── Shared mock setup ────────────────────────────────────────────────────────

const mockTrackEvent = jest.fn();
jest.mock("@/app/frontend/services/AnalyticsService", () => ({
  AnalyticsService: {
    getInstance: () => ({ trackEvent: mockTrackEvent }),
  },
}));

const mockTransactionGet = jest.fn();
const mockTransactionSet = jest.fn();
const mockTransactionUpdate = jest.fn();
const mockRentalGet = jest.fn();

const mockRentalRef = { id: "generated-rental-id", get: mockRentalGet };
const mockStationRef = {};

const mockRunTransaction = jest.fn(
  async (callback: (t: any) => Promise<any>) =>
    callback({
      get: mockTransactionGet,
      set: mockTransactionSet,
      update: mockTransactionUpdate,
    }),
);

jest.mock("@/app/api/lib/firebaseAdmin", () => ({
  dbAdmin: {
    collection: jest.fn((name: string) => ({
      doc: jest.fn(() =>
        name === "rentals" ? mockRentalRef : mockStationRef,
      ),
    })),
    runTransaction: (...args: any[]) => mockRunTransaction(...(args as [any])),
  },
}));

import { POST as createRental } from "@/app/api/rent-a-bike/rent/create/route";
import { POST as completeRental } from "@/app/api/rent-a-bike/rent/complete/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function postRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function stationSnapshot(availableBikes: number, availableDocks: number) {
  return {
    exists: true,
    data: () => ({ availableBikes, availableDocks }),
  };
}

const FIXED_NOW = new Date("2026-04-08T12:00:00.000Z").getTime();

const validCreateInput = {
  userId: "user-abc",
  userKey: "key-abc",
  userEmail: "test@example.com",
  startStationId: "station-1",
  startStationName: "Milton / Parc",
  serviceFee: 1.25,
  pricePerMinute: 0.15,
};

const validCompleteInput = {
  rentalId: "rental-1",
  returnStationId: "station-2",
  returnStationName: "Milton / Sherbrooke",
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── createRental — missing edge cases ───────────────────────────────────────

describe("POST /api/rent-a-bike/rent/create — additional edge cases", () => {
  it("returns an error response when the Firestore transaction throws unexpectedly", async () => {
    mockRunTransaction.mockRejectedValueOnce(new Error("Unexpected DB error"));
    const res = await createRental(
      postRequest("http://localhost/api/rent-a-bike/rent/create", validCreateInput),
    );
    // Route catches all errors and returns 400
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Unexpected DB error");
  });

  it("stores the userEmail field in the rental document written by transaction.set", async () => {
    mockTransactionGet.mockResolvedValue(stationSnapshot(3, 2));

    await createRental(
      postRequest("http://localhost/api/rent-a-bike/rent/create", validCreateInput),
    );

    expect(mockTransactionSet).toHaveBeenCalledWith(
      mockRentalRef,
      expect.objectContaining({ userEmail: validCreateInput.userEmail }),
    );
  });

  it("does not include a startedAt field in the rental document (set by the start step)", async () => {
    mockTransactionGet.mockResolvedValue(stationSnapshot(3, 2));

    await createRental(
      postRequest("http://localhost/api/rent-a-bike/rent/create", validCreateInput),
    );

    const [, rentalData] = mockTransactionSet.mock.calls[0];
    expect(rentalData).not.toHaveProperty("startedAt");
  });

  it("stores the userKey field in the rental document", async () => {
    mockTransactionGet.mockResolvedValue(stationSnapshot(3, 2));

    await createRental(
      postRequest("http://localhost/api/rent-a-bike/rent/create", validCreateInput),
    );

    expect(mockTransactionSet).toHaveBeenCalledWith(
      mockRentalRef,
      expect.objectContaining({ userKey: validCreateInput.userKey }),
    );
  });
});

// ─── completeRental — missing edge cases ─────────────────────────────────────

describe("POST /api/rent-a-bike/rent/complete — additional edge cases", () => {
  it("returns 400 (or non-200) when rentalId is missing from the request body", async () => {
    // Without a rentalId the dbAdmin.collection().doc() call gets undefined,
    // and the subsequent .get() will throw — route should handle gracefully.
    mockRentalGet.mockRejectedValueOnce(new Error("Invalid document reference"));
    const res = await completeRental(
      postRequest("http://localhost/api/rent-a-bike/rent/complete", {
        returnStationId: "station-2",
        returnStationName: "Milton / Sherbrooke",
      }),
    );
    expect(res.status).not.toBe(200);
  });

  it("writes a returnedAt timestamp to the rental document", async () => {
    mockRentalGet.mockResolvedValue({
      exists: true,
      data: () => ({
        serviceFee: 1.0,
        pricePerMinute: 0.5,
        startedAt: FIXED_NOW - 5 * 60_000,
      }),
    });
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({ availableBikes: 2, availableDocks: 3 }),
    });

    await completeRental(
      postRequest(
        "http://localhost/api/rent-a-bike/rent/complete",
        validCompleteInput,
      ),
    );

    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      mockRentalRef,
      expect.objectContaining({ returnedAt: expect.any(Date) }),
    );
  });

  it("analytics event includes a non-negative latencyMs value", async () => {
    mockRentalGet.mockResolvedValue({
      exists: true,
      data: () => ({
        serviceFee: 1.0,
        pricePerMinute: 0.5,
        startedAt: FIXED_NOW - 5 * 60_000,
      }),
    });
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({ availableBikes: 2, availableDocks: 3 }),
    });

    await completeRental(
      postRequest(
        "http://localhost/api/rent-a-bike/rent/complete",
        validCompleteInput,
      ),
    );

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "API_REQUEST_COMPLETED",
      expect.objectContaining({ latencyMs: expect.any(Number) }),
    );

    const eventData = mockTrackEvent.mock.calls[0][1];
    expect(eventData.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("writes the correct returnStationId and returnStationName to the rental doc", async () => {
    mockRentalGet.mockResolvedValue({
      exists: true,
      data: () => ({
        serviceFee: 1.0,
        pricePerMinute: 0.5,
        startedAt: FIXED_NOW - 5 * 60_000,
      }),
    });
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({ availableBikes: 2, availableDocks: 3 }),
    });

    await completeRental(
      postRequest(
        "http://localhost/api/rent-a-bike/rent/complete",
        validCompleteInput,
      ),
    );

    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      mockRentalRef,
      expect.objectContaining({
        returnStationId: validCompleteInput.returnStationId,
        returnStationName: validCompleteInput.returnStationName,
      }),
    );
  });
});
