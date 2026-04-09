/**
 * Step 4 — rent/create business logic tests
 *
 * Mocks firebaseAdmin so the Firestore transaction runs against
 * in-memory stubs. Tests cover station-not-found, no-bikes, and
 * the happy path response shape.
 */

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockTrackEvent = jest.fn();
jest.mock("@/app/frontend/services/AnalyticsService", () => ({
  AnalyticsService: {
    getInstance: () => ({ trackEvent: mockTrackEvent }),
  },
}));

// Mutable refs so individual tests can override transaction behaviour
const mockTransactionGet = jest.fn();
const mockTransactionSet = jest.fn();
const mockTransactionUpdate = jest.fn();

const mockRentalRef = { id: "generated-rental-id" };
const mockStationRef = {};

const mockRunTransaction = jest.fn(
  async (callback: (t: any) => Promise<void>) => {
    return callback({
      get: mockTransactionGet,
      set: mockTransactionSet,
      update: mockTransactionUpdate,
    });
  },
);

jest.mock("@/app/api/lib/firebaseAdmin", () => ({
  dbAdmin: {
    collection: jest.fn((name: string) => ({
      doc: jest.fn(() => (name === "rentals" ? mockRentalRef : mockStationRef)),
    })),
    runTransaction: (...args: any[]) => mockRunTransaction.apply(null, args),
  },
}));

// ─── Route under test ─────────────────────────────────────────────────────────

import { POST as createRental } from "@/app/api/rent-a-bike/rent/create/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const validInput = {
  userId: "user-abc",
  userKey: "key-abc",
  userEmail: "test@example.com",
  startStationId: "station-1",
  startStationName: "Milton / Parc",
  serviceFee: 1.25,
  pricePerMinute: 0.15,
};

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/rent-a-bike/rent/create", {
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

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/rent-a-bike/rent/create — business logic", () => {
  // ── Station not found ──────────────────────────────────────────────────────

  it("returns 400 when the start station does not exist", async () => {
    mockTransactionGet.mockResolvedValue({ exists: false });

    const res = await createRental(postRequest(validInput));

    expect(res.status).toBe(400);
  });

  it("returns the correct error message when station is not found", async () => {
    mockTransactionGet.mockResolvedValue({ exists: false });

    const res = await createRental(postRequest(validInput));
    const body = await res.json();

    expect(body.error).toBe("Start station not found.");
  });

  // ── No bikes available ─────────────────────────────────────────────────────

  it("returns 400 when there are no bikes at the station", async () => {
    mockTransactionGet.mockResolvedValue(stationSnapshot(0, 5));

    const res = await createRental(postRequest(validInput));

    expect(res.status).toBe(400);
  });

  it("returns the correct error message when no bikes are available", async () => {
    mockTransactionGet.mockResolvedValue(stationSnapshot(0, 5));

    const res = await createRental(postRequest(validInput));
    const body = await res.json();

    expect(body.error).toBe("No bikes available at this station.");
  });

  it("returns 400 when availableBikes is negative (edge case)", async () => {
    mockTransactionGet.mockResolvedValue(stationSnapshot(-1, 6));

    const res = await createRental(postRequest(validInput));

    expect(res.status).toBe(400);
  });

  // ── Successful creation ────────────────────────────────────────────────────

  it("returns 200 on a valid request with bikes available", async () => {
    mockTransactionGet.mockResolvedValue(stationSnapshot(3, 2));

    const res = await createRental(postRequest(validInput));

    expect(res.status).toBe(200);
  });

  it("returns the rental id in the response body", async () => {
    mockTransactionGet.mockResolvedValue(stationSnapshot(3, 2));

    const res = await createRental(postRequest(validInput));
    const body = await res.json();

    expect(body.id).toBe("generated-rental-id");
  });

  it("returns isOpen: true and status: active in the response", async () => {
    mockTransactionGet.mockResolvedValue(stationSnapshot(3, 2));

    const res = await createRental(postRequest(validInput));
    const body = await res.json();

    expect(body.isOpen).toBe(true);
    expect(body.status).toBe("active");
  });

  it("reflects the submitted input fields in the response", async () => {
    mockTransactionGet.mockResolvedValue(stationSnapshot(3, 2));

    const res = await createRental(postRequest(validInput));
    const body = await res.json();

    expect(body.userId).toBe(validInput.userId);
    expect(body.startStationId).toBe(validInput.startStationId);
    expect(body.startStationName).toBe(validInput.startStationName);
    expect(body.serviceFee).toBe(validInput.serviceFee);
    expect(body.pricePerMinute).toBe(validInput.pricePerMinute);
  });

  it("calls transaction.set with the rental data", async () => {
    mockTransactionGet.mockResolvedValue(stationSnapshot(3, 2));

    await createRental(postRequest(validInput));

    expect(mockTransactionSet).toHaveBeenCalledWith(
      mockRentalRef,
      expect.objectContaining({
        userId: validInput.userId,
        isOpen: true,
        status: "active",
      }),
    );
  });

  it("decrements availableBikes and increments availableDocks on the station", async () => {
    mockTransactionGet.mockResolvedValue(stationSnapshot(3, 2));

    await createRental(postRequest(validInput));

    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      mockStationRef,
      expect.objectContaining({
        availableBikes: 2, // 3 - 1
        availableDocks: 3, // 2 + 1
      }),
    );
  });

  it("fires an analytics event after a successful rental", async () => {
    mockTransactionGet.mockResolvedValue(stationSnapshot(3, 2));

    await createRental(postRequest(validInput));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "API_REQUEST_COMPLETED",
      expect.objectContaining({
        endpoint: "Rent a bike",
        startStation: validInput.startStationName,
      }),
    );
  });

  it("does not fire analytics when the transaction fails", async () => {
    mockTransactionGet.mockResolvedValue({ exists: false });

    await createRental(postRequest(validInput));

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
