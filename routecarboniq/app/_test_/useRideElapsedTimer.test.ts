/**
 * @jest-environment jsdom
 *
 * useRideElapsedTimer hook tests
 *
 * Mocks Firebase dependencies and uses fake timers to deterministically
 * test the elapsed-time counter without real I/O.
 */

jest.mock("@/app/frontend/lib/firebaseClient", () => ({
  db: { collection: jest.fn() },
  default: {},
}));

jest.mock("@/app/frontend/services/AnalyticsService", () => ({
  AnalyticsService: { getInstance: () => ({ trackEvent: jest.fn() }) },
}));

import { renderHook, act } from "@testing-library/react";
import { useRideElapsedTimer } from "../frontend/pages/rent-a-bike/hooks/useRideElapsedTimer";
import type { RentalRecord } from "../frontend/pages/rent-a-bike/services/rentalFlow";

// A fixed point in time that all tests use as "now".
const FIXED_NOW = 1_000_000_000_000;

function makeRental(startedAt: unknown): RentalRecord {
  return {
    id: "r1",
    userKey: "k1",
    userId: "u1",
    userEmail: "u@test.com",
    startStationId: "s1",
    startStationName: "Test Station",
    serviceFee: 1,
    pricePerMinute: 0.1,
    isOpen: true,
    status: "active",
    startedAt,
  };
}

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["queueMicrotask", "nextTick"] });
  jest.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useRideElapsedTimer", () => {
  // ── No rental 

  it("returns 0 when activeRental is null", () => {
    const { result } = renderHook(() => useRideElapsedTimer(null));
    expect(result.current).toBe(0);
  });

  it("returns 0 when startedAt is null", () => {
    const { result } = renderHook(() => useRideElapsedTimer(makeRental(null)));
    expect(result.current).toBe(0);
  });

  // ── Initial elapsed time 

  it("calculates the correct elapsed seconds on mount", () => {
    const startedAt = FIXED_NOW - 30_000; // 30 seconds ago
    const { result } = renderHook(() =>
      useRideElapsedTimer(makeRental(startedAt)),
    );
    expect(result.current).toBe(30);
  });

  it("does not go negative when startedAt is in the future", () => {
    const startedAt = FIXED_NOW + 5_000; // 5 seconds in the future
    const { result } = renderHook(() =>
      useRideElapsedTimer(makeRental(startedAt)),
    );
    expect(result.current).toBe(0);
  });

  // ── Timer increments 

  it("increments by 1 every second while the rental is active", () => {
    const startedAt = FIXED_NOW - 10_000; // 10 seconds ago
    const { result } = renderHook(() =>
      useRideElapsedTimer(makeRental(startedAt)),
    );
    expect(result.current).toBe(10);

    act(() => {
      jest.advanceTimersByTime(3_000);
    });

    expect(result.current).toBe(13);
  });

  // ── Rental change 

  it("resets to 0 when the rental changes to null", () => {
    const startedAt = FIXED_NOW - 20_000;
    const { result, rerender } = renderHook(
      ({ rental }: { rental: RentalRecord | null }) =>
        useRideElapsedTimer(rental),
      {
        initialProps: { rental: makeRental(startedAt) as RentalRecord | null },
      },
    );
    expect(result.current).toBe(20);

    rerender({ rental: null });

    expect(result.current).toBe(0);
  });

  // ── Cleanup 

  it("calls clearInterval when the component unmounts", () => {
    const clearSpy = jest.spyOn(window, "clearInterval");
    const { unmount } = renderHook(() =>
      useRideElapsedTimer(makeRental(FIXED_NOW - 5_000)),
    );
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });

  it("stops incrementing after the component unmounts", () => {
    const startedAt = FIXED_NOW - 5_000;
    const { result, unmount } = renderHook(() =>
      useRideElapsedTimer(makeRental(startedAt)),
    );
    expect(result.current).toBe(5);

    unmount();

    act(() => {
      jest.advanceTimersByTime(5_000);
    });

    expect(result.current).toBe(5);
  });
});
