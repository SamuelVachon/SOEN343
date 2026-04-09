/**
 * analytics/track/route.ts — switch-branch tests
 *
 * Each event type writes to Firestore. These tests verify that the correct
 * collections and fields are written for every branch, which is important
 * because corrupt writes silently degrade dashboard accuracy.
 */

// Mock setup

const mockGlobalRefSet = jest.fn().mockResolvedValue(undefined);
const mockUserRefSet = jest.fn().mockResolvedValue(undefined);
const mockDbRunTransaction = jest.fn();
const mockIncrementFn = jest.fn((n: number) => ({ _inc: n }));
const mockArrayUnionFn = jest.fn((...args: any[]) => ({ _au: args }));

const mockGlobalRef = { set: mockGlobalRefSet };

jest.mock("@/app/frontend/lib/firebaseClient", () => ({
  __esModule: true,
  default: {
    firestore: {
      FieldValue: {
        // Return plain identifiable sentinels so we can assert call structure
        increment: mockIncrementFn,
        arrayUnion: mockArrayUnionFn,
      },
    },
  },
  db: {
    collection: jest.fn((name: string) =>
      name === "global_analytics"
        ? { doc: jest.fn(() => mockGlobalRef) }
        : { doc: jest.fn(() => ({ set: mockUserRefSet })) },
    ),
    runTransaction: (...args: any[]) => mockDbRunTransaction(...args),
  },
}));

// Route under test

import { POST as trackAnalytics } from "@/app/api/analytics/track/route";

// Helpers

function postRequest(events: unknown[]): Request {
  return new Request("http://localhost/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGlobalRefSet.mockResolvedValue(undefined);
  mockUserRefSet.mockResolvedValue(undefined);
});

//  Tests

describe("POST /api/analytics/track — USER_LOGIN", () => {
  it("writes dailyActiveUsers to global_analytics with the userId", async () => {
    const res = await trackAnalytics(
      postRequest([{ eventName: "USER_LOGIN", eventData: { userId: "u1" } }]),
    );
    expect(res.status).toBe(200);
    expect(mockGlobalRefSet).toHaveBeenCalledWith(
      expect.objectContaining({ dailyActiveUsers: expect.anything() }),
      { merge: true },
    );
    // Check the arrayUnion sentinel contains the userId
    const [payload] = mockGlobalRefSet.mock.calls[0];
    expect(payload.dailyActiveUsers._au[0]).toMatchObject({ userId: "u1" });
  });
});

describe("POST /api/analytics/track — RIDE_COMPLETED", () => {
  it("increments user totalRides, totalRideTime, and totalMoneySpent when userId is present", async () => {
    const res = await trackAnalytics(
      postRequest([
        {
          eventName: "RIDE_COMPLETED",
          eventData: { userId: "u2", rideDuration: 12, cost: 2.5 },
        },
      ]),
    );
    expect(res.status).toBe(200);
    expect(mockUserRefSet).toHaveBeenCalledWith(
      expect.objectContaining({
        totalRides: expect.anything(),
        totalRideTime: expect.anything(),
        totalMoneySpent: expect.anything(),
      }),
      { merge: true },
    );
    const [userPayload] = mockUserRefSet.mock.calls[0];
    expect(userPayload.totalRides._inc).toBe(1);
    expect(userPayload.totalRideTime._inc).toBe(12);
    expect(userPayload.totalMoneySpent._inc).toBe(2.5);
  });

  it("increments global totalRides and totalRevenue", async () => {
    await trackAnalytics(
      postRequest([
        {
          eventName: "RIDE_COMPLETED",
          eventData: { userId: "u2", rideDuration: 12, cost: 2.5 },
        },
      ]),
    );
    const globalCalls = mockGlobalRefSet.mock.calls;
    const globalPayload = globalCalls[0][0];
    expect(globalPayload.totalRides._inc).toBe(1);
    expect(globalPayload.totalRevenue._inc).toBe(2.5);
    expect(globalPayload.totalRideDuration._inc).toBe(12);
  });

  it("falls back to rideCost when cost is not present", async () => {
    await trackAnalytics(
      postRequest([
        {
          eventName: "RIDE_COMPLETED",
          eventData: { userId: "u3", rideDuration: 5, rideCost: 1.75 },
        },
      ]),
    );
    const [userPayload] = mockUserRefSet.mock.calls[0];
    expect(userPayload.totalMoneySpent._inc).toBe(1.75);
  });

  it("skips user write and only updates global when userId is absent", async () => {
    await trackAnalytics(
      postRequest([
        {
          eventName: "RIDE_COMPLETED",
          eventData: { rideDuration: 8, cost: 1.0 },
        },
      ]),
    );
    expect(mockUserRefSet).not.toHaveBeenCalled();
    expect(mockGlobalRefSet).toHaveBeenCalled();
  });
});

describe("POST /api/analytics/track — SESSION_ENDED / SCREEN_TIME_LOGGED", () => {
  it("increments screenTime for SESSION_ENDED when userId is present", async () => {
    const res = await trackAnalytics(
      postRequest([
        {
          eventName: "SESSION_ENDED",
          eventData: { userId: "u4", durationInSeconds: 300 },
        },
      ]),
    );
    expect(res.status).toBe(200);
    const [userPayload] = mockUserRefSet.mock.calls[0];
    expect(userPayload.screenTime._inc).toBe(300);
  });

  it("increments screenTime for SCREEN_TIME_LOGGED", async () => {
    await trackAnalytics(
      postRequest([
        {
          eventName: "SCREEN_TIME_LOGGED",
          eventData: { userId: "u5", durationInSeconds: 120 },
        },
      ]),
    );
    expect(mockUserRefSet).toHaveBeenCalled();
    const [userPayload] = mockUserRefSet.mock.calls[0];
    expect(userPayload.screenTime._inc).toBe(120);
  });

  it("does not write to user_analytics when userId is absent for SESSION_ENDED", async () => {
    await trackAnalytics(
      postRequest([
        { eventName: "SESSION_ENDED", eventData: { durationInSeconds: 60 } },
      ]),
    );
    expect(mockUserRefSet).not.toHaveBeenCalled();
  });
});

describe("POST /api/analytics/track — API_REQUEST_COMPLETED", () => {
  it("increments totalApiRequests and writes apiMetrics for the endpoint", async () => {
    const res = await trackAnalytics(
      postRequest([
        {
          eventName: "API_REQUEST_COMPLETED",
          eventData: { endpoint: "Live Bixi Station Feed", latencyMs: 250 },
        },
      ]),
    );
    expect(res.status).toBe(200);
    const [globalPayload] = mockGlobalRefSet.mock.calls[0];
    expect(globalPayload.totalApiRequests._inc).toBe(1);
    expect(globalPayload.totalApiResponseTime._inc).toBe(250);
    expect(globalPayload.apiMetrics).toHaveProperty("Live Bixi Station Feed");
  });

  it("sanitises special characters in the endpoint name for Firestore keys", async () => {
    await trackAnalytics(
      postRequest([
        {
          eventName: "API_REQUEST_COMPLETED",
          eventData: { endpoint: "api/v1?foo=bar", latencyMs: 100 },
        },
      ]),
    );
    const [globalPayload] = mockGlobalRefSet.mock.calls[0];
    // "/" "?" "=" should all be replaced with "_"
    const key = Object.keys(globalPayload.apiMetrics)[0];
    expect(key).not.toMatch(/[/?=.]/);
  });

  it("reads latency from responseTimeMs when latencyMs is absent", async () => {
    await trackAnalytics(
      postRequest([
        {
          eventName: "API_REQUEST_COMPLETED",
          eventData: { endpoint: "Rent a bike", responseTimeMs: 80 },
        },
      ]),
    );
    const [globalPayload] = mockGlobalRefSet.mock.calls[0];
    expect(globalPayload.totalApiResponseTime._inc).toBe(80);
  });

  it("runs the stationUsageMap transaction when endpoint is 'Rent a bike' and startStation is set", async () => {
    const mockTxGet = jest.fn().mockResolvedValue({ data: () => ({}) });
    const mockTxSet = jest.fn();
    mockDbRunTransaction.mockImplementation(async (cb: any) =>
      cb({ get: mockTxGet, set: mockTxSet }),
    );

    await trackAnalytics(
      postRequest([
        {
          eventName: "API_REQUEST_COMPLETED",
          eventData: {
            endpoint: "Rent a bike",
            startStation: "Milton / Parc",
            latencyMs: 10,
          },
        },
      ]),
    );

    expect(mockDbRunTransaction).toHaveBeenCalled();
    expect(mockTxSet).toHaveBeenCalledWith(
      mockGlobalRef,
      expect.objectContaining({
        stationUsageMap: expect.objectContaining({ "Milton / Parc": 1 }),
      }),
      { merge: true },
    );
  });

  it("increments an existing station count in stationUsageMap", async () => {
    const mockTxGet = jest.fn().mockResolvedValue({
      data: () => ({ stationUsageMap: { "Milton / Parc": 4 } }),
    });
    const mockTxSet = jest.fn();
    mockDbRunTransaction.mockImplementation(async (cb: any) =>
      cb({ get: mockTxGet, set: mockTxSet }),
    );

    await trackAnalytics(
      postRequest([
        {
          eventName: "API_REQUEST_COMPLETED",
          eventData: {
            endpoint: "Rent a bike",
            startStation: "Milton / Parc",
            latencyMs: 10,
          },
        },
      ]),
    );

    expect(mockTxSet).toHaveBeenCalledWith(
      mockGlobalRef,
      expect.objectContaining({
        stationUsageMap: { "Milton / Parc": 5 },
      }),
      { merge: true },
    );
  });

  it("does not run the stationUsageMap transaction when startStation is absent", async () => {
    await trackAnalytics(
      postRequest([
        {
          eventName: "API_REQUEST_COMPLETED",
          eventData: { endpoint: "Rent a bike", latencyMs: 10 },
        },
      ]),
    );
    expect(mockDbRunTransaction).not.toHaveBeenCalled();
  });
});

describe("POST /api/analytics/track — misc", () => {
  it("returns 200 for an unknown event type without throwing", async () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const res = await trackAnalytics(
      postRequest([{ eventName: "UNKNOWN_EVENT", eventData: {} }]),
    );
    expect(res.status).toBe(200);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("processes multiple events in a single batch", async () => {
    await trackAnalytics(
      postRequest([
        { eventName: "USER_LOGIN", eventData: { userId: "u1" } },
        { eventName: "USER_LOGIN", eventData: { userId: "u2" } },
      ]),
    );
    expect(mockGlobalRefSet).toHaveBeenCalledTimes(2);
  });

  it("returns 500 when a Firestore write fails unexpectedly", async () => {
    mockGlobalRefSet.mockRejectedValueOnce(new Error("Firestore unavailable"));
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const res = await trackAnalytics(
      postRequest([{ eventName: "USER_LOGIN", eventData: { userId: "u1" } }]),
    );
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
