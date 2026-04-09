/**
 * stationInventory service tests
 *
 * Verifies the fetch-wrapper functions for adding and removing bikes,
 * including success cases, server error messages, and fallback messages.
 */

import {
  addBikeToStation,
  removeBikeFromStation,
} from "../frontend/pages/rent-a-bike/services/stationInventory";

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── addBikeToStation ─────────────────────────────────────────────────────────

describe("addBikeToStation", () => {
  it("resolves with the response data on a successful request", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ availableBikes: 5, availableDocks: 2 }),
    });

    const result = await addBikeToStation("station-1");

    expect(result).toEqual({ availableBikes: 5, availableDocks: 2 });
  });

  it("calls the correct endpoint with the stationId in the body", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await addBikeToStation("station-42");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/rent-a-bike/stations/inventory/add-bike",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ stationId: "station-42" }),
      }),
    );
  });

  it("throws the server error message when the response is not ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "No docks available" }),
    });

    await expect(addBikeToStation("station-1")).rejects.toThrow(
      "No docks available",
    );
  });

  it("throws the fallback message when the error field is absent", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(addBikeToStation("station-1")).rejects.toThrow(
      "Failed to add bike",
    );
  });
});

// ─── removeBikeFromStation ────────────────────────────────────────────────────

describe("removeBikeFromStation", () => {
  it("resolves with the response data on a successful request", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ availableBikes: 3, availableDocks: 4 }),
    });

    const result = await removeBikeFromStation("station-2");

    expect(result).toEqual({ availableBikes: 3, availableDocks: 4 });
  });

  it("calls the correct endpoint with the stationId in the body", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await removeBikeFromStation("station-99");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/rent-a-bike/stations/inventory/remove-bike",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ stationId: "station-99" }),
      }),
    );
  });

  it("throws the server error message when the response is not ok", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "No bikes available" }),
    });

    await expect(removeBikeFromStation("station-2")).rejects.toThrow(
      "No bikes available",
    );
  });

  it("throws the fallback message when the error field is absent", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(removeBikeFromStation("station-2")).rejects.toThrow(
      "Failed to remove bike",
    );
  });
});
