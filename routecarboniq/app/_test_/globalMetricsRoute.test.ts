/**
 * analytics/metrics/global/route.ts — unit tests
 *
 * Covers: default zeros, data passthrough, computed fields
 * (averageRideDuration, apiResponseTimeAverage, dailyActiveUsersCount),
 * backward-compat flat-key handling, exclusion list, and error path.
 */

// ─── Mock firebaseClient ──────────────────────────────────────────────────────

const mockDocGet = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockDocGet }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));

jest.mock("@/app/frontend/lib/firebaseClient", () => ({
  __esModule: true,
  default: {},
  db: { collection: mockCollection },
}));

// ─── Route under test ─────────────────────────────────────────────────────────

import { GET as getGlobalMetrics } from "@/app/api/analytics/metrics/global/route";

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeRequest(): Request {
  return new Request("http://localhost/api/analytics/metrics/global");
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Doc does not exist ───────────────────────────────────────────────────────

describe("GET /api/analytics/metrics/global — doc does not exist", () => {
  beforeEach(() => {
    mockDocGet.mockResolvedValue({ exists: false });
  });

  it("returns 200 when there is no system_metrics doc", async () => {
    const res = await getGlobalMetrics();
    expect(res.status).toBe(200);
  });

  it("returns default zero values for all numeric fields", async () => {
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.totalRides).toBe(0);
    expect(body.totalRevenue).toBe(0);
    expect(body.totalRideDuration).toBe(0);
    expect(body.totalApiRequests).toBe(0);
    expect(body.totalApiResponseTime).toBe(0);
  });

  it("returns an empty array for dailyActiveUsers", async () => {
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.dailyActiveUsers).toEqual([]);
  });

  it("returns an empty object for stationUsageMap", async () => {
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.stationUsageMap).toEqual({});
  });
});

// ─── Basic data passthrough ───────────────────────────────────────────────────

describe("GET /api/analytics/metrics/global — basic data passthrough", () => {
  it("returns stored totalRides and totalRevenue values", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ totalRides: 42, totalRevenue: 99.5 }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.totalRides).toBe(42);
    expect(body.totalRevenue).toBe(99.5);
  });
});

// ─── averageRideDuration ──────────────────────────────────────────────────────

describe("GET /api/analytics/metrics/global — averageRideDuration", () => {
  it("calculates averageRideDuration as totalRideDuration / totalRides", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ totalRides: 10, totalRideDuration: 300 }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.averageRideDuration).toBe(30);
  });

  it("returns averageRideDuration of 0 when totalRides is 0 (no division by zero)", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ totalRides: 0, totalRideDuration: 0 }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.averageRideDuration).toBe(0);
  });

  it("rounds averageRideDuration to the nearest integer", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ totalRides: 3, totalRideDuration: 10 }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    // 10 / 3 = 3.33… → Math.round → 3
    expect(body.averageRideDuration).toBe(3);
  });
});

// ─── apiResponseTimeAverage ───────────────────────────────────────────────────

describe("GET /api/analytics/metrics/global — apiResponseTimeAverage", () => {
  it("calculates apiResponseTimeAverage correctly", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ totalApiRequests: 4, totalApiResponseTime: 800 }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.apiResponseTimeAverage).toBe(200);
  });

  it("returns 0 when totalApiRequests is 0", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ totalApiRequests: 0, totalApiResponseTime: 0 }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.apiResponseTimeAverage).toBe(0);
  });
});

// ─── dailyActiveUsersCount ────────────────────────────────────────────────────

describe("GET /api/analytics/metrics/global — dailyActiveUsersCount", () => {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];

  it("counts only users whose date matches today", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        dailyActiveUsers: [
          { userId: "u1", date: today },
          { userId: "u2", date: yesterday },
        ],
      }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.dailyActiveUsersCount).toBe(1);
  });

  it("deduplicates users — same userId appearing twice counts once", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        dailyActiveUsers: [
          { userId: "u1", date: today },
          { userId: "u1", date: today },
          { userId: "u2", date: today },
        ],
      }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.dailyActiveUsersCount).toBe(2);
  });

  it("returns 0 when dailyActiveUsers is an empty array", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ dailyActiveUsers: [] }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.dailyActiveUsersCount).toBe(0);
  });

  it("returns 0 when dailyActiveUsers is absent from the doc", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({}),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.dailyActiveUsersCount).toBe(0);
  });
});

// ─── apiEndpointAverages — nested apiMetrics ─────────────────────────────────

describe("GET /api/analytics/metrics/global — nested apiMetrics processing", () => {
  it("calculates the average response time per endpoint from nested apiMetrics", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        apiMetrics: {
          "Rent a bike": { count: 2, totalTime: 400 },
        },
      }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.apiEndpointAverages["Rent a bike"]).toBe(200);
    expect(body.apiEndpointCounts["Rent a bike"]).toBe(2);
  });

  it("excludes 'Return a bike Check-out' from apiEndpointAverages", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        apiMetrics: {
          "Return a bike Check-out": { count: 5, totalTime: 500 },
          "Rent a bike": { count: 1, totalTime: 100 },
        },
      }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.apiEndpointAverages).not.toHaveProperty("Return a bike Check-out");
    expect(body.apiEndpointAverages).toHaveProperty("Rent a bike");
  });

  it("excludes the sanitised 'Return_a_bike_Check_out' key as well", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        apiMetrics: {
          Return_a_bike_Check_out: { count: 3, totalTime: 300 },
        },
      }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.apiEndpointAverages).not.toHaveProperty("Return_a_bike_Check_out");
  });

  it("skips endpoints with count of 0 to avoid division by zero", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        apiMetrics: {
          "Empty Endpoint": { count: 0, totalTime: 0 },
        },
      }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.apiEndpointAverages).not.toHaveProperty("Empty Endpoint");
  });
});

// ─── Backward-compat flat apiMetrics keys ────────────────────────────────────

describe("GET /api/analytics/metrics/global — flat apiMetrics key backward compat", () => {
  it("processes flat 'apiMetrics.<endpoint>.count' and 'apiMetrics.<endpoint>.totalTime' keys", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        "apiMetrics.Rent_a_bike.count": 4,
        "apiMetrics.Rent_a_bike.totalTime": 800,
      }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.apiEndpointAverages["Rent_a_bike"]).toBe(200);
    expect(body.apiEndpointCounts["Rent_a_bike"]).toBe(4);
  });
});

// ─── Backward-compat flat stationUsageMap keys ───────────────────────────────

describe("GET /api/analytics/metrics/global — flat stationUsageMap backward compat", () => {
  it("merges flat 'stationUsageMap.<name>' keys into the stationUsageMap object", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        "stationUsageMap.Milton / Parc": 3,
        "stationUsageMap.Sherbrooke / Parc": 5,
      }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.stationUsageMap["Milton / Parc"]).toBe(3);
    expect(body.stationUsageMap["Sherbrooke / Parc"]).toBe(5);
  });

  it("adds flat keys on top of nested stationUsageMap values", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        stationUsageMap: { "Milton / Parc": 2 },
        "stationUsageMap.Milton / Parc": 3,
      }),
    });
    const res = await getGlobalMetrics();
    const body = await res.json();
    expect(body.stationUsageMap["Milton / Parc"]).toBe(5);
  });
});

// ─── Error path ───────────────────────────────────────────────────────────────

describe("GET /api/analytics/metrics/global — Firestore error", () => {
  it("returns 500 when Firestore throws unexpectedly", async () => {
    mockDocGet.mockRejectedValue(new Error("Firestore unavailable"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await getGlobalMetrics();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/internal server error/i);
    consoleSpy.mockRestore();
  });
});
