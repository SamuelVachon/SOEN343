/**
 * rentalFlow.ts — client-side service function tests
 *
 * These are the functions called directly from UI components to create,
 * start, and complete rentals. Silent failures here means the user sees
 * no error and the UI gets stuck.
 */

//  Mock setup 

const mockOnSnapshot = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock("@/app/frontend/lib/firebaseClient", () => ({
  db: {
    collection: jest.fn(() => ({
      onSnapshot: mockOnSnapshot,
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
  },
  default: {},
}));

jest.mock("@/app/frontend/services/AnalyticsService", () => ({
  AnalyticsService: { getInstance: () => ({ trackEvent: jest.fn() }) },
}));

// Functions under test 

import {
  createRental,
  startRide,
  completeRental,
  seedStationsIfEmpty,
  subscribeToStations,
  subscribeToOpenRental,
} from "../frontend/pages/rent-a-bike/services/rentalFlow";
import type { FirestoreStation } from "../frontend/pages/rent-a-bike/services/rentalFlow";

// Helpers 

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  mockOnSnapshot.mockReturnValue(mockUnsubscribe);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// createRental 

describe("createRental", () => {
  const input = {
    userKey: "k1",
    userId: "u1",
    userEmail: "u@test.com",
    startStationId: "s1",
    startStationName: "Milton / Parc",
    serviceFee: 1.25,
    pricePerMinute: 0.15,
  };

  it("POSTs to the correct endpoint with the input as JSON", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "r1", status: "active" }),
    });

    await createRental(input);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/rent-a-bike/rent/create",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  });

  it("returns the rental data on success", async () => {
    const rentalData = { id: "r1", status: "active", isOpen: true };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => rentalData,
    });

    const result = await createRental(input);
    expect(result).toMatchObject(rentalData);
  });

  it("throws the server error message on failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "No bikes available at this station." }),
    });

    await expect(createRental(input)).rejects.toThrow(
      "No bikes available at this station.",
    );
  });

  it("throws the fallback message when the error field is absent", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(createRental(input)).rejects.toThrow(
      "Failed to create rental",
    );
  });
});

// startRide

describe("startRide", () => {
  it("POSTs the rentalId to the correct endpoint", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await startRide("rental-abc");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/rent-a-bike/rent/start",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ rentalId: "rental-abc" }),
      }),
    );
  });

  it("resolves without a return value on success", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await expect(startRide("rental-abc")).resolves.toBeUndefined();
  });

  it("throws the server error on failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "rentalId is required" }),
    });

    await expect(startRide("")).rejects.toThrow("rentalId is required");
  });

  it("throws the fallback message when error field is absent", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(startRide("rental-abc")).rejects.toThrow(
      "Failed to start ride",
    );
  });
});

// completeRental 

describe("completeRental", () => {
  const input = {
    rentalId: "r1",
    returnStationId: "s2",
    returnStationName: "Milton / Sherbrooke",
  };

  it("POSTs the input to the correct endpoint", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ actualDurationMinutes: 5, finalCharge: 2.0 }),
    });

    await completeRental(input);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/rent-a-bike/rent/complete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  });

  it("returns actualDurationMinutes and finalCharge on success", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ actualDurationMinutes: 5, finalCharge: 2.0 }),
    });

    const result = await completeRental(input);
    expect(result.actualDurationMinutes).toBe(5);
    expect(result.finalCharge).toBe(2.0);
  });

  it("throws the server error on failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Rental not found." }),
    });

    await expect(completeRental(input)).rejects.toThrow("Rental not found.");
  });

  it("throws the fallback message when error field is absent", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(completeRental(input)).rejects.toThrow(
      "Failed to complete rental",
    );
  });
});

//seedStationsIfEmpty

describe("seedStationsIfEmpty", () => {
  const stations = [
    {
      station_id: "s1",
      name: "Milton / Parc",
      capacity: 19,
      num_bikes_available: 7,
      num_docks_available: 12,
    },
  ];

  it("returns the seeded count from the response on success", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ seeded: 1 }),
    });

    const result = await seedStationsIfEmpty(stations);
    expect(result).toBe(1);
  });

  it("posts to the seed endpoint with the station list", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ seeded: 1 }),
    });

    await seedStationsIfEmpty(stations);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/rent-a-bike/stations/seed",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ stations }),
      }),
    );
  });

  it("throws the server error on failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Seed failed" }),
    });

    await expect(seedStationsIfEmpty(stations)).rejects.toThrow("Seed failed");
  });

  it("throws the fallback message when error field is absent", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(seedStationsIfEmpty(stations)).rejects.toThrow(
      "Failed to seed stations",
    );
  });
});

// subscribeToStations 

describe("subscribeToStations", () => {
  it("calls the callback with mapped stations from the Firestore snapshot", () => {
    const fakeSnapshot = {
      docs: [
        {
          id: "s1",
          data: () => ({
            name: "Milton / Parc",
            capacity: 19,
            availableBikes: 7,
            availableDocks: 12,
          }),
        },
      ],
    };

    mockOnSnapshot.mockImplementation(
      (cb: (snap: typeof fakeSnapshot) => void) => {
        cb(fakeSnapshot);
        return mockUnsubscribe;
      },
    );

    const callback = jest.fn();
    subscribeToStations(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    const [stations] = callback.mock.calls[0] as [FirestoreStation[]];
    expect(stations).toHaveLength(1);
    expect(stations[0].id).toBe("s1");
    expect(stations[0].name).toBe("Milton / Parc");
    expect(stations[0].availableBikes).toBe(7);
  });

  it("returns the unsubscribe function from onSnapshot", () => {
    mockOnSnapshot.mockReturnValue(mockUnsubscribe);
    const unsubscribe = subscribeToStations(jest.fn());
    expect(unsubscribe).toBe(mockUnsubscribe);
  });
});

//  subscribeToOpenRental 

describe("subscribeToOpenRental", () => {
  it("calls the callback with the rental when the snapshot has a matching doc", () => {
    const fakeDoc = {
      id: "r1",
      data: () => ({
        userKey: "k1",
        userId: "u1",
        isOpen: true,
        status: "active",
        startStationId: "s1",
        startStationName: "Milton / Parc",
        serviceFee: 1.25,
        pricePerMinute: 0.15,
        userEmail: "u@test.com",
      }),
    };

    mockOnSnapshot.mockImplementation((successCb: (snap: any) => void) => {
      successCb({ empty: false, docs: [fakeDoc] });
      return mockUnsubscribe;
    });

    const callback = jest.fn();
    subscribeToOpenRental("k1", "u1", callback);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ id: "r1", userId: "u1", isOpen: true }),
    );
  });

  it("calls the callback with null when the snapshot is empty (no open rental)", () => {
    mockOnSnapshot.mockImplementation((successCb: (snap: any) => void) => {
      successCb({ empty: true, docs: [] });
      return mockUnsubscribe;
    });

    const callback = jest.fn();
    subscribeToOpenRental("k1", "u1", callback);

    expect(callback).toHaveBeenCalledWith(null);
  });

  it("calls the callback with null on a Firestore permission-denied error", () => {
    mockOnSnapshot.mockImplementation(
      (_successCb: unknown, errorCb: (err: Error) => void) => {
        errorCb(new Error("permission-denied"));
        return mockUnsubscribe;
      },
    );

    const callback = jest.fn();
    subscribeToOpenRental("k1", "u1", callback);

    expect(callback).toHaveBeenCalledWith(null);
  });

  it("returns the unsubscribe function", () => {
    mockOnSnapshot.mockReturnValue(mockUnsubscribe);
    const unsub = subscribeToOpenRental("k1", "u1", jest.fn());
    expect(unsub).toBe(mockUnsubscribe);
  });
});
