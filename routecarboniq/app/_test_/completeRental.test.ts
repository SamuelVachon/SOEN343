/**
 * complete/route.ts business-logic tests
 *
 * Mocks dbAdmin for Firestore and freezes system time for deterministic
 * duration and charge calculations.
 */

// Mock setup 

const mockTrackEvent = jest.fn();
jest.mock("@/app/frontend/services/AnalyticsService", () => ({
  AnalyticsService: {
    getInstance: () => ({ trackEvent: mockTrackEvent }),
  },
}));

const mockRentalGet = jest.fn();
const mockRentalRef = { get: mockRentalGet };
const mockStationRef = {};

const mockTransactionGet = jest.fn();
const mockTransactionUpdate = jest.fn();

const mockRunTransaction = jest.fn(async (callback: (t: any) => Promise<any>) =>
  callback({
    get: mockTransactionGet,
    update: mockTransactionUpdate,
  }),
);

jest.mock("@/app/api/lib/firebaseAdmin", () => ({
  dbAdmin: {
    collection: jest.fn((name: string) => ({
      doc: jest.fn(() => (name === "rentals" ? mockRentalRef : mockStationRef)),
    })),
    runTransaction: (...args: any[]) => mockRunTransaction(...(args as [any])),
  },
}));

// Route under test 

import { POST as completeRental } from "@/app/api/rent-a-bike/rent/complete/route";

// Helpers

const FIXED_NOW = new Date("2026-04-08T12:00:00.000Z").getTime();

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/rent-a-bike/rent/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function rentalData(overrides: Record<string, unknown> = {}) {
  return {
    exists: true,
    data: () => ({
      serviceFee: 1.25,
      pricePerMinute: 0.15,
      startedAt: FIXED_NOW - 5 * 60_000, // 5 minutes ago by default
      ...overrides,
    }),
  };
}

function stationData(availableBikes: number, availableDocks: number) {
  return {
    exists: true,
    data: () => ({ availableBikes, availableDocks }),
  };
}

const validInput = {
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

//  Tests 

describe("POST /api/rent-a-bike/rent/complete", () => {
  //  Rental not found 

  it("returns 400 when the rental does not exist", async () => {
    mockRentalGet.mockResolvedValue({ exists: false });
    const res = await completeRental(postRequest(validInput));
    expect(res.status).toBe(400);
  });

  it("returns the correct error message when rental is not found", async () => {
    mockRentalGet.mockResolvedValue({ exists: false });
    const res = await completeRental(postRequest(validInput));
    const body = await res.json();
    expect(body.error).toBe("Rental not found.");
  });

  // Return station not found 

  it("returns 400 when the return station does not exist", async () => {
    mockRentalGet.mockResolvedValue(rentalData());
    mockTransactionGet.mockResolvedValue({ exists: false });
    const res = await completeRental(postRequest(validInput));
    expect(res.status).toBe(400);
  });

  it("returns the correct error message when return station is not found", async () => {
    mockRentalGet.mockResolvedValue(rentalData());
    mockTransactionGet.mockResolvedValue({ exists: false });
    const res = await completeRental(postRequest(validInput));
    const body = await res.json();
    expect(body.error).toBe("Return station not found.");
  });

  // Duration & charge calculation

  it("returns 200 with the correct duration and charge for a 5-minute ride", async () => {
    mockRentalGet.mockResolvedValue(rentalData()); // default: startedAt = 5 min ago
    mockTransactionGet.mockResolvedValue(stationData(2, 3));

    const res = await completeRental(postRequest(validInput));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.actualDurationMinutes).toBe(5);
    // 1.25 + 5 * 0.15 = 2.00
    expect(body.finalCharge).toBeCloseTo(2.0);
  });

  it("enforces a minimum of 1 minute for a sub-minute ride", async () => {
    mockRentalGet.mockResolvedValue(
      rentalData({
        startedAt: FIXED_NOW - 30_000,
        serviceFee: 1.0,
        pricePerMinute: 0.5,
      }),
    );
    mockTransactionGet.mockResolvedValue(stationData(2, 3));

    const res = await completeRental(postRequest(validInput));
    const body = await res.json();
    expect(body.actualDurationMinutes).toBe(1); // Math.max(1, ceil(0.5))
    expect(body.finalCharge).toBeCloseTo(1.5); // 1.0 + 1 * 0.5
  });

  it("falls back to a 1-minute duration when startedAt is missing", async () => {
    mockRentalGet.mockResolvedValue(
      rentalData({ startedAt: null, serviceFee: 1.0, pricePerMinute: 0.5 }),
    );
    mockTransactionGet.mockResolvedValue(stationData(2, 3));

    const res = await completeRental(postRequest(validInput));
    const body = await res.json();
    // returnTime === FIXED_NOW, diff = 0 ms → Math.max(1, 0) = 1 minute
    expect(body.actualDurationMinutes).toBe(1);
  });

  // Station inventory update 

  it("increments availableBikes and decrements availableDocks at the return station", async () => {
    mockRentalGet.mockResolvedValue(rentalData());
    mockTransactionGet.mockResolvedValue(stationData(4, 5));

    await completeRental(postRequest(validInput));

    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      mockStationRef,
      expect.objectContaining({ availableBikes: 5, availableDocks: 4 }),
    );
  });

  it("clamps availableDocks to 0 when the station is already full", async () => {
    mockRentalGet.mockResolvedValue(rentalData());
    mockTransactionGet.mockResolvedValue(stationData(5, 0));

    await completeRental(postRequest(validInput));

    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      mockStationRef,
      expect.objectContaining({
        availableBikes: 6,
        availableDocks: 0, // Math.max(0, 0 - 1)
      }),
    );
  });

  // Rental document update 

  it("marks the rental as closed and completed in Firestore", async () => {
    mockRentalGet.mockResolvedValue(rentalData());
    mockTransactionGet.mockResolvedValue(stationData(2, 3));

    await completeRental(postRequest(validInput));

    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      mockRentalRef,
      expect.objectContaining({
        isOpen: false,
        status: "completed",
        returnStationId: validInput.returnStationId,
        returnStationName: validInput.returnStationName,
      }),
    );
  });

  //  Analytics 

  it("fires an analytics event after a successful return", async () => {
    mockRentalGet.mockResolvedValue(rentalData());
    mockTransactionGet.mockResolvedValue(stationData(2, 3));

    await completeRental(postRequest(validInput));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "API_REQUEST_COMPLETED",
      expect.objectContaining({ endpoint: "Return a bike Check-out" }),
    );
  });

  it("does not fire analytics when the rental is not found", async () => {
    mockRentalGet.mockResolvedValue({ exists: false });
    await completeRental(postRequest(validInput));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("does not fire analytics when the return station is not found", async () => {
    mockRentalGet.mockResolvedValue(rentalData());
    mockTransactionGet.mockResolvedValue({ exists: false });
    await completeRental(postRequest(validInput));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
