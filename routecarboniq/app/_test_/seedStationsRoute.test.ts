/**
 * stations/seed/route.ts — unit tests
 *
 * Covers: already-seeded guard, successful batch write, response shape,
 * field mapping, lat/lon defaulting, empty array, and Firestore error path.
 */

// ─── Mock firebaseAdmin ───────────────────────────────────────────────────────

const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockBatch = { set: mockBatchSet, commit: mockBatchCommit };

const mockLimitGet = jest.fn();
const mockDocRef = {};
const mockCollectionRef = {
  limit: jest.fn(() => ({ get: mockLimitGet })),
  doc: jest.fn(() => mockDocRef),
};

jest.mock("@/app/api/lib/firebaseAdmin", () => ({
  dbAdmin: {
    collection: jest.fn(() => mockCollectionRef),
    batch: jest.fn(() => mockBatch),
  },
}));

// ─── Route under test ─────────────────────────────────────────────────────────

import { POST as seedStations } from "@/app/api/rent-a-bike/stations/seed/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/rent-a-bike/stations/seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const sampleStations = [
  {
    station_id: "s1",
    name: "Milton / Parc",
    capacity: 19,
    lat: 45.5088,
    lon: -73.5878,
    num_bikes_available: 7,
    num_docks_available: 12,
  },
  {
    station_id: "s2",
    name: "Sherbrooke / Parc",
    capacity: 15,
    lat: 45.512,
    lon: -73.58,
    num_bikes_available: 3,
    num_docks_available: 12,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockBatchCommit.mockResolvedValue(undefined);
});

// ─── Already seeded guard ─────────────────────────────────────────────────────

describe("POST /api/rent-a-bike/stations/seed — already seeded", () => {
  beforeEach(() => {
    mockLimitGet.mockResolvedValue({ empty: false });
  });

  it("returns 200 when the collection already has documents", async () => {
    const res = await seedStations(postRequest({ stations: sampleStations }));
    expect(res.status).toBe(200);
  });

  it("returns seeded: false and a message when already seeded", async () => {
    const res = await seedStations(postRequest({ stations: sampleStations }));
    const body = await res.json();
    expect(body.seeded).toBe(false);
    expect(body.message).toMatch(/already seeded/i);
  });

  it("does not call batch.commit when already seeded", async () => {
    await seedStations(postRequest({ stations: sampleStations }));
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });
});

// ─── Successful seeding ───────────────────────────────────────────────────────

describe("POST /api/rent-a-bike/stations/seed — successful seeding", () => {
  beforeEach(() => {
    mockLimitGet.mockResolvedValue({ empty: true });
  });

  it("returns 200 on a successful seed", async () => {
    const res = await seedStations(postRequest({ stations: sampleStations }));
    expect(res.status).toBe(200);
  });

  it("returns seeded: true on success", async () => {
    const res = await seedStations(postRequest({ stations: sampleStations }));
    const body = await res.json();
    expect(body.seeded).toBe(true);
  });

  it("calls batch.set once per station", async () => {
    await seedStations(postRequest({ stations: sampleStations }));
    expect(mockBatchSet).toHaveBeenCalledTimes(sampleStations.length);
  });

  it("calls batch.commit to persist the writes", async () => {
    await seedStations(postRequest({ stations: sampleStations }));
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it("maps num_bikes_available to availableBikes in the stored doc", async () => {
    await seedStations(postRequest({ stations: [sampleStations[0]] }));
    const [, docData] = mockBatchSet.mock.calls[0];
    expect(docData.availableBikes).toBe(sampleStations[0].num_bikes_available);
  });

  it("maps num_docks_available to availableDocks in the stored doc", async () => {
    await seedStations(postRequest({ stations: [sampleStations[0]] }));
    const [, docData] = mockBatchSet.mock.calls[0];
    expect(docData.availableDocks).toBe(sampleStations[0].num_docks_available);
  });

  it("stores lat and lon when they are provided", async () => {
    await seedStations(postRequest({ stations: [sampleStations[0]] }));
    const [, docData] = mockBatchSet.mock.calls[0];
    expect(docData.lat).toBe(sampleStations[0].lat);
    expect(docData.lon).toBe(sampleStations[0].lon);
  });

  it("defaults lat and lon to null when they are absent from the input", async () => {
    const { lat, lon, ...withoutCoords } = sampleStations[0];
    await seedStations(postRequest({ stations: [withoutCoords] }));
    const [, docData] = mockBatchSet.mock.calls[0];
    expect(docData.lat).toBeNull();
    expect(docData.lon).toBeNull();
  });

  it("stores the station name and capacity", async () => {
    await seedStations(postRequest({ stations: [sampleStations[0]] }));
    const [, docData] = mockBatchSet.mock.calls[0];
    expect(docData.name).toBe(sampleStations[0].name);
    expect(docData.capacity).toBe(sampleStations[0].capacity);
  });
});

// ─── Empty stations array ─────────────────────────────────────────────────────

describe("POST /api/rent-a-bike/stations/seed — empty array", () => {
  beforeEach(() => {
    mockLimitGet.mockResolvedValue({ empty: true });
  });

  it("does not throw when stations is an empty array", async () => {
    const res = await seedStations(postRequest({ stations: [] }));
    expect(res.status).toBe(200);
  });

  it("does not call batch.set when stations is empty", async () => {
    await seedStations(postRequest({ stations: [] }));
    expect(mockBatchSet).not.toHaveBeenCalled();
  });
});

// ─── Firestore error path ─────────────────────────────────────────────────────

describe("POST /api/rent-a-bike/stations/seed — Firestore error", () => {
  it("returns 400 when batch.commit throws", async () => {
    mockLimitGet.mockResolvedValue({ empty: true });
    mockBatchCommit.mockRejectedValue(new Error("Firestore unavailable"));

    const res = await seedStations(postRequest({ stations: sampleStations }));
    expect(res.status).toBe(400);
  });

  it("includes the error message in the response body", async () => {
    mockLimitGet.mockResolvedValue({ empty: true });
    mockBatchCommit.mockRejectedValue(new Error("Firestore unavailable"));

    const res = await seedStations(postRequest({ stations: sampleStations }));
    const body = await res.json();
    expect(body.error).toBe("Firestore unavailable");
  });
});
