/**
 * AnalyticsService — additional edge-case tests
 *
 * Covers: concurrent-call guard (isProcessing), network-level fetch
 * rejection for getUserMetrics and getGlobalMetrics, and empty-string
 * userId in eventData not causing a throw.
 */

import { AnalyticsService } from "../frontend/services/AnalyticsService";

beforeEach(() => {
  AnalyticsService.resetInstance();
  global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const getInstance = () => AnalyticsService.getInstance();

// ─── Concurrent call guard ────────────────────────────────────────────────────

describe("AnalyticsService — isProcessing guard", () => {
  it("does not start a second processQueue run while one is already in progress", async () => {
    // Make fetch take a while so the first processQueue is still running
    let resolveFetch!: () => void;
    (global.fetch as jest.Mock).mockReturnValue(
      new Promise<Response>((res) => {
        resolveFetch = () => res({ ok: true } as Response);
      }),
    );

    const service = getInstance();

    // Fire two trackEvent calls without awaiting — both should share the
    // same processQueue run, resulting in a single fetch call (one batch).
    service.trackEvent("USER_LOGIN", { userId: "u1" });
    service.trackEvent("USER_LOGIN", { userId: "u2" });

    // Let the microtask queue settle so processQueue has entered the while loop
    await new Promise((r) => setTimeout(r, 0));

    // Only one fetch should have been initiated — the guard prevented a second
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(1);

    // Unblock fetch so the test doesn't hang
    resolveFetch();
    await new Promise((r) => setTimeout(r, 0));
  });
});

// ─── trackEvent with empty-string userId ─────────────────────────────────────

describe("AnalyticsService.trackEvent — empty-string userId", () => {
  it("does not throw when eventData contains an empty-string userId", async () => {
    const service = getInstance();
    await expect(
      service.trackEvent("USER_LOGIN", { userId: "" }),
    ).resolves.not.toThrow();
  });

  it("still calls fetch when eventData contains an empty-string userId", async () => {
    const service = getInstance();
    await service.trackEvent("USER_LOGIN", { userId: "" });
    await new Promise((r) => setTimeout(r, 0));
    expect(global.fetch).toHaveBeenCalled();
  });
});

// ─── getUserMetrics — network-level rejection ─────────────────────────────────

describe("AnalyticsService.getUserMetrics — network failure", () => {
  it("returns null when fetch itself rejects (network error)", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network failure"),
    );
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const service = getInstance();
    const result = await service.getUserMetrics("user-123");

    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it("logs the error to console.error on network failure", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network failure"),
    );
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const service = getInstance();
    await service.getUserMetrics("user-123");

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── getGlobalMetrics — network-level rejection ───────────────────────────────

describe("AnalyticsService.getGlobalMetrics — network failure", () => {
  it("returns null when fetch itself rejects (network error)", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network failure"),
    );
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const service = getInstance();
    const result = await service.getGlobalMetrics();

    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it("logs the error to console.error on network failure", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network failure"),
    );
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const service = getInstance();
    await service.getGlobalMetrics();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
