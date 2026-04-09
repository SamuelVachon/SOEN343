/**
 * Step 3 — API route input validation tests
 *
 * These tests call the exported route handlers directly with a bare Request
 * object. No Firebase connection is needed because all assertions target
 * guard clauses that return before any Firestore call is made.
 */

// ─── Mock Firebase / service dependencies ────────────────────────────────────
// The mocks must be declared before the route imports so Jest hoists them.

jest.mock("@/app/api/lib/firebaseAdmin", () => ({
  dbAdmin: {
    collection: jest.fn(),
    runTransaction: jest.fn(),
  },
}));

jest.mock("@/app/frontend/lib/firebaseClient", () => ({
  db: { collection: jest.fn() },
  default: {},
}));

jest.mock("@/app/frontend/services/AnalyticsService", () => ({
  AnalyticsService: {
    getInstance: () => ({ trackEvent: jest.fn() }),
  },
}));

// ─── Route handlers under test ────────────────────────────────────────────────

import { POST as createRental } from "@/app/api/rent-a-bike/rent/create/route";
import { POST as startRide } from "@/app/api/rent-a-bike/rent/start/route";
import { POST as trackAnalytics } from "@/app/api/analytics/track/route";
import { GET as getUserMetrics } from "@/app/api/analytics/metrics/user/route";
import { POST as addBike } from "@/app/api/rent-a-bike/stations/inventory/add-bike/route";
import { POST as removeBike } from "@/app/api/rent-a-bike/stations/inventory/remove-bike/route";

//  Firebase mock references 
import { dbAdmin } from "@/app/api/lib/firebaseAdmin";
import { db } from "@/app/frontend/lib/firebaseClient";

// Reset mocks before each test so happy-path setups don't bleed across tests.
// Sad-path guard clauses return before any Firebase call, so this is safe.
beforeEach(() => {
  jest.resetAllMocks();
});

// Helpers 

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest(url: string): Request {
  return new Request(url);
}

// rent/create 

describe("POST /api/rent-a-bike/rent/create", () => {
  it("returns 401 when userId is missing", async () => {
    const res = await createRental(postRequest({ startStationId: "s1" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when userId is an empty string", async () => {
    const res = await createRental(
      postRequest({ userId: "", startStationId: "s1" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns the correct error message when userId is missing", async () => {
    const res = await createRental(postRequest({}));
    const body = await res.json();
    expect(body.error).toMatch(/authentication required/i);
  });
});

//  rent/start 

describe("POST /api/rent-a-bike/rent/start", () => {
  it("returns 400 when rentalId is missing", async () => {
    const res = await startRide(postRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when rentalId is null", async () => {
    const res = await startRide(postRequest({ rentalId: null }));
    expect(res.status).toBe(400);
  });

  it("returns the correct error message when rentalId is missing", async () => {
    const res = await startRide(postRequest({}));
    const body = await res.json();
    expect(body.error).toBe("rentalId is required");
  });
});

//  analytics/track 

describe("POST /api/analytics/track", () => {
  it("returns 400 when events field is missing", async () => {
    const res = await trackAnalytics(postRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when events is not an array", async () => {
    const res = await trackAnalytics(postRequest({ events: "not-an-array" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when events is null", async () => {
    const res = await trackAnalytics(postRequest({ events: null }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when events is a plain object instead of array", async () => {
    const res = await trackAnalytics(
      postRequest({ events: { eventName: "USER_LOGIN" } }),
    );
    expect(res.status).toBe(400);
  });

  it("returns the correct error message for invalid payload", async () => {
    const res = await trackAnalytics(postRequest({}));
    const body = await res.json();
    expect(body.error).toBe("Invalid payload");
  });
});

// analytics/metrics/user 

describe("GET /api/analytics/metrics/user", () => {
  it("returns 400 when userId query param is missing", async () => {
    const res = await getUserMetrics(
      getRequest("http://localhost/api/analytics/metrics/user"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when userId is an empty string", async () => {
    const res = await getUserMetrics(
      getRequest("http://localhost/api/analytics/metrics/user?userId="),
    );
    expect(res.status).toBe(400);
  });

  it("returns the correct error message when userId is missing", async () => {
    const res = await getUserMetrics(
      getRequest("http://localhost/api/analytics/metrics/user"),
    );
    const body = await res.json();
    expect(body.error).toBe("Missing userId parameter");
  });
});

// stations/inventory/add-bike 

describe("POST /api/rent-a-bike/stations/inventory/add-bike", () => {
  it("returns 400 when stationId is missing", async () => {
    const res = await addBike(postRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when stationId is null", async () => {
    const res = await addBike(postRequest({ stationId: null }));
    expect(res.status).toBe(400);
  });

  it("returns the correct error message when stationId is missing", async () => {
    const res = await addBike(postRequest({}));
    const body = await res.json();
    expect(body.error).toBe("stationId is required");
  });
});

//  stations/inventory/remove-bike 

describe("POST /api/rent-a-bike/stations/inventory/remove-bike", () => {
  it("returns 400 when stationId is missing", async () => {
    const res = await removeBike(postRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when stationId is null", async () => {
    const res = await removeBike(postRequest({ stationId: null }));
    expect(res.status).toBe(400);
  });

  it("returns the correct error message when stationId is missing", async () => {
    const res = await removeBike(postRequest({}));
    const body = await res.json();
    expect(body.error).toBe("stationId is required");
  });
});

//  Happy paths 

describe("POST /api/rent-a-bike/rent/start — happy path", () => {
  it("returns 200 with { success: true } when rentalId is valid", async () => {
    (dbAdmin.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        update: jest.fn().mockResolvedValue(undefined),
      }),
    });
    const res = await startRide(postRequest({ rentalId: "rental-abc" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

describe("POST /api/analytics/track — happy path", () => {
  it("returns 200 when events is a valid empty array (no Firebase calls)", async () => {
    const res = await trackAnalytics(postRequest({ events: [] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("Analytics processed");
  });
});

describe("GET /api/analytics/metrics/user — happy path", () => {
  it("returns 200 with stored data when the user doc exists", async () => {
    (db.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            totalRides: 7,
            totalRideTime: 120,
            screenTime: 300,
            totalMoneySpent: 5.25,
          }),
        }),
      }),
    });
    const res = await getUserMetrics(
      getRequest("http://localhost/api/analytics/metrics/user?userId=user-1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalRides).toBe(7);
  });

  it("returns 200 with default zeros when no doc exists for the user", async () => {
    (db.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      }),
    });
    const res = await getUserMetrics(
      getRequest("http://localhost/api/analytics/metrics/user?userId=new-user"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalRides).toBe(0);
  });
});

describe("POST /api/rent-a-bike/stations/inventory/add-bike — happy path", () => {
  it("returns 200 with updated counts when stationId is valid and docks are available", async () => {
    const mockTxGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ availableBikes: 2, availableDocks: 3 }),
    });
    const mockTxUpdate = jest.fn();
    (dbAdmin.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({}),
    });
    (dbAdmin.runTransaction as jest.Mock).mockImplementation(
      async (cb: (t: any) => Promise<any>) =>
        cb({ get: mockTxGet, update: mockTxUpdate }),
    );
    const res = await addBike(postRequest({ stationId: "station-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.availableBikes).toBe(3); // 2 + 1
    expect(body.availableDocks).toBe(2); // 3 - 1
  });
});

describe("POST /api/rent-a-bike/stations/inventory/remove-bike — happy path", () => {
  it("returns 200 with updated counts when stationId is valid and bikes are available", async () => {
    const mockTxGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ availableBikes: 4, availableDocks: 2 }),
    });
    const mockTxUpdate = jest.fn();
    (dbAdmin.collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue({}),
    });
    (dbAdmin.runTransaction as jest.Mock).mockImplementation(
      async (cb: (t: any) => Promise<any>) =>
        cb({ get: mockTxGet, update: mockTxUpdate }),
    );
    const res = await removeBike(postRequest({ stationId: "station-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.availableBikes).toBe(3); // 4 - 1
    expect(body.availableDocks).toBe(3); // 2 + 1
  });
});
