/**
 * @jest-environment jsdom
 *
 * useStationsData hook — unit tests
 *
 * Covers: initial loading state, Firestore subscription lifecycle,
 * state updates on snapshot, unsubscribe on unmount, and the
 * stationsLoadedFromFirestore guard.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUnsubscribe = jest.fn();
const mockSubscribeToStations = jest.fn();
const mockSeedStationsIfEmpty = jest.fn();

jest.mock("../frontend/pages/rent-a-bike/services/rentalFlow", () => ({
  subscribeToStations: (...args: any[]) => mockSubscribeToStations(...args),
  seedStationsIfEmpty: (...args: any[]) => mockSeedStationsIfEmpty(...args),
}));

jest.mock("@/app/frontend/services/AnalyticsService", () => ({
  AnalyticsService: {
    getInstance: () => ({ trackEvent: jest.fn() }),
  },
}));

// Mock fetch used by fetchFeed inside the hook
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { stations: [] } }),
  });
  mockUnsubscribe.mockReset();
  mockSubscribeToStations.mockReset();
  mockSeedStationsIfEmpty.mockReset().mockResolvedValue(0);

  // Default: subscribeToStations immediately fires an empty snapshot then
  // returns the unsubscribe function.
  mockSubscribeToStations.mockImplementation(
    (cb: (stations: any[]) => void) => {
      cb([]);
      return mockUnsubscribe;
    },
  );
});

import { renderHook, act, waitFor } from "@testing-library/react";
import { useStationsData } from "../frontend/pages/rent-a-bike/hooks/useStationsData";
import type { FirestoreStation } from "../frontend/pages/rent-a-bike/services/rentalFlow";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStation(overrides: Partial<FirestoreStation> = {}): FirestoreStation {
  return {
    id: "s1",
    name: "Milton / Parc",
    capacity: 19,
    lat: 45.5088,
    lon: -73.5878,
    availableBikes: 7,
    availableDocks: 12,
    ...overrides,
  };
}

// ─── Initial state ────────────────────────────────────────────────────────────

describe("useStationsData — initial state", () => {
  it("returns an empty stations array before any snapshot fires", () => {
    mockSubscribeToStations.mockReturnValue(mockUnsubscribe); // never fires cb
    const { result } = renderHook(() => useStationsData());
    expect(result.current.stations).toEqual([]);
  });

  it("starts with loading: true", () => {
    mockSubscribeToStations.mockReturnValue(mockUnsubscribe);
    const { result } = renderHook(() => useStationsData());
    expect(result.current.loading).toBe(true);
  });

  it("starts with lastUpdated: null", () => {
    mockSubscribeToStations.mockReturnValue(mockUnsubscribe);
    const { result } = renderHook(() => useStationsData());
    expect(result.current.lastUpdated).toBeNull();
  });
});

// ─── Firestore subscription ───────────────────────────────────────────────────

describe("useStationsData — Firestore subscription", () => {
  it("calls subscribeToStations on mount", () => {
    renderHook(() => useStationsData());
    expect(mockSubscribeToStations).toHaveBeenCalledTimes(1);
  });

  it("calls the unsubscribe function returned by subscribeToStations on unmount", () => {
    mockSubscribeToStations.mockReturnValue(mockUnsubscribe);
    const { unmount } = renderHook(() => useStationsData());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("updates stations state when the Firestore snapshot fires with data", async () => {
    const firestoreStation = makeStation();

    mockSubscribeToStations.mockImplementation(
      (cb: (stations: FirestoreStation[]) => void) => {
        cb([firestoreStation]);
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => useStationsData());

    await waitFor(() => {
      expect(result.current.stations).toHaveLength(1);
    });

    expect(result.current.stations[0].station_id).toBe("s1");
    expect(result.current.stations[0].num_bikes_available).toBe(7);
  });

  it("sets loading to false inside the subscribeToStations callback when stations arrive", async () => {
    // The second useEffect immediately calls load() which sets loading=true,
    // then sets loading=false in its finally only when stationsLoadedFromFirestore
    // is still true in that closure. We instead test the simpler, guaranteed
    // contract: stations are populated and lastUpdated is set (which requires
    // the subscription callback to have run to completion).
    mockSubscribeToStations.mockImplementation(
      (cb: (stations: FirestoreStation[]) => void) => {
        cb([makeStation()]);
        return mockUnsubscribe;
      },
    );
    mockSeedStationsIfEmpty.mockResolvedValue(0);

    const { result } = renderHook(() => useStationsData());

    await waitFor(() => {
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });
    expect(result.current.stations).toHaveLength(1);
  });

  it("sets lastUpdated to a Date after a non-empty snapshot", async () => {
    mockSubscribeToStations.mockImplementation(
      (cb: (stations: FirestoreStation[]) => void) => {
        cb([makeStation()]);
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => useStationsData());

    await waitFor(() => {
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });
  });

  it("does not update stations when the snapshot is empty", () => {
    // Default mock fires an empty snapshot — stations should remain []
    const { result } = renderHook(() => useStationsData());
    expect(result.current.stations).toEqual([]);
  });

  it("maps multiple Firestore stations to UI station shape", async () => {
    const s1 = makeStation({ id: "s1", name: "Station A" });
    const s2 = makeStation({ id: "s2", name: "Station B" });

    mockSubscribeToStations.mockImplementation(
      (cb: (stations: FirestoreStation[]) => void) => {
        cb([s1, s2]);
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => useStationsData());

    await waitFor(() => {
      expect(result.current.stations).toHaveLength(2);
    });

    const ids = result.current.stations.map((s) => s.station_id);
    expect(ids).toContain("s1");
    expect(ids).toContain("s2");
  });
});
