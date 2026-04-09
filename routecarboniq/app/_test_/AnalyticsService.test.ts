import { AnalyticsService } from "../frontend/services/AnalyticsService";
import type {
  EventName,
  EventData,
} from "../frontend/services/AnalyticsService";

// Reset singleton and fetch mock between every test
beforeEach(() => {
  (AnalyticsService as any).instance = undefined;
  global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Helper to get a fresh instance
const getInstance = () => AnalyticsService.getInstance();

// ─── Singleton ────────────────────────────────────────────────────────────────

describe("getInstance", () => {
  it("returns an AnalyticsService instance", () => {
    expect(getInstance()).toBeInstanceOf(AnalyticsService);
  });

  it("always returns the same instance", () => {
    const a = getInstance();
    const b = getInstance();
    expect(a).toBe(b);
  });

  it("returns a new instance after manual reset", () => {
    const a = getInstance();
    (AnalyticsService as any).instance = undefined;
    const b = getInstance();
    expect(a).not.toBe(b);
  });
});

// ─── Observer / Subscribe ─────────────────────────────────────────────────────

describe("subscribe", () => {
  it("calls the observer when trackEvent is called", async () => {
    const service = getInstance();
    const observer = jest.fn();
    service.subscribe(observer);

    await service.trackEvent("USER_LOGIN", { userId: "u1" });

    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenCalledWith("USER_LOGIN", { userId: "u1" });
  });

  it("calls multiple observers", async () => {
    const service = getInstance();
    const obs1 = jest.fn();
    const obs2 = jest.fn();
    service.subscribe(obs1);
    service.subscribe(obs2);

    await service.trackEvent("SESSION_ENDED", {
      userId: "u2",
      durationInSeconds: 60,
    });

    expect(obs1).toHaveBeenCalledTimes(1);
    expect(obs2).toHaveBeenCalledTimes(1);
  });

  it("returns an unsubscribe function that stops future notifications", async () => {
    const service = getInstance();
    const observer = jest.fn();
    const unsubscribe = service.subscribe(observer);

    unsubscribe();
    await service.trackEvent("SESSION_ENDED", { userId: "u3" });

    expect(observer).not.toHaveBeenCalled();
  });

  it("only unsubscribes the specific observer, not others", async () => {
    const service = getInstance();
    const obs1 = jest.fn();
    const obs2 = jest.fn();
    const unsubscribe = service.subscribe(obs1);
    service.subscribe(obs2);

    unsubscribe();
    await service.trackEvent("USER_LOGIN", { userId: "u4" });

    expect(obs1).not.toHaveBeenCalled();
    expect(obs2).toHaveBeenCalledTimes(1);
  });
});

// ─── trackEvent → queue → fetch ───────────────────────────────────────────────

describe("trackEvent", () => {
  it("sends the event to the analytics API endpoint", async () => {
    const service = getInstance();

    await service.trackEvent("RIDE_COMPLETED", {
      userId: "u5",
      rideDuration: 15,
      cost: 3.5,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/analytics/track"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("RIDE_COMPLETED"),
      }),
    );
  });

  it("sends the correct event payload structure", async () => {
    const service = getInstance();
    const eventData: EventData = { userId: "u6", responseTimeMs: 120 };

    await service.trackEvent("API_REQUEST_COMPLETED", eventData);

    const call = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toEqual({
      eventName: "API_REQUEST_COMPLETED",
      eventData,
    });
  });

  it("batches up to 10 events per fetch call", async () => {
    const service = getInstance();

    // Seed 11 items directly into the private queue (bypasses async timing)
    const queueItems = Array.from({ length: 11 }, (_, i) => ({
      eventName: "SESSION_ENDED" as EventName,
      eventData: { userId: `user-${i}`, durationInSeconds: i * 10 },
    }));
    (service as any).queue = [...queueItems];

    // Trigger processing via the private method
    await (service as any).processQueue();
    // Flush remaining microtasks
    await new Promise((r) => setTimeout(r, 0));

    const fetchCalls = (global.fetch as jest.Mock).mock.calls;

    // First batch must be exactly 10
    const firstBatch = JSON.parse(fetchCalls[0][1].body).events;
    expect(firstBatch).toHaveLength(10);

    // Second batch must contain the remaining 1
    const secondBatch = JSON.parse(fetchCalls[1][1].body).events;
    expect(secondBatch).toHaveLength(1);

    // Total sent = 11
    const total = fetchCalls.reduce((sum: number, call: any[]) => {
      return sum + JSON.parse(call[1].body).events.length;
    }, 0);
    expect(total).toBe(11);
  });

  it("re-queues the batch and stops processing on fetch failure", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error"),
    );
    const service = getInstance();
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await service.trackEvent("USER_LOGIN", { userId: "u7" });
    // Give async processing a chance to run
    await new Promise((r) => setTimeout(r, 0));

    // The failed batch should be back in the queue (isProcessing = false after failure)
    const queue: unknown[] = (service as any).queue;
    expect(queue).toHaveLength(1);
    consoleSpy.mockRestore();
  });
});

// ─── Fetch endpoints ──────────────────────────────────────────────────────────

describe("getUserMetrics", () => {
  it("fetches from the correct user metrics URL", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ totalRides: 5 }),
    } as Response);

    const service = getInstance();
    const result = await service.getUserMetrics("user-123");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/analytics/metrics/user?userId=user-123",
    );
    expect(result).toEqual({ totalRides: 5 });
  });

  it("returns null when the request fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    } as Response);
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const service = getInstance();
    const result = await service.getUserMetrics("user-bad");

    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });
});

describe("getGlobalMetrics", () => {
  it("fetches from the global metrics URL", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ totalRides: 100 }),
    } as Response);

    const service = getInstance();
    const result = await service.getGlobalMetrics();

    expect(global.fetch).toHaveBeenCalledWith("/api/analytics/metrics/global");
    expect(result).toEqual({ totalRides: 100 });
  });

  it("returns null when the request fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    } as Response);
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const service = getInstance();
    const result = await service.getGlobalMetrics();

    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });
});
