/**
 * gbfs/route.ts — unit tests
 *
 * Covers: missing feed param, unknown feed name, all five valid feeds,
 * upstream non-OK response, and network-level fetch failure.
 */

import { GET as getGbfs } from "@/app/api/gbfs/route";

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeRequest(search: string): Request {
  return new Request(`http://localhost/api/gbfs${search}`);
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe("GET /api/gbfs — validation", () => {
  it("returns 400 when the feed query param is missing", async () => {
    const res = await getGbfs(makeRequest(""));
    expect(res.status).toBe(400);
  });

  it("returns an error body when feed param is missing", async () => {
    const res = await getGbfs(makeRequest(""));
    const body = await res.json();
    expect(body.error).toBe("Invalid feed");
  });

  it("returns 400 for an unrecognised feed name", async () => {
    const res = await getGbfs(makeRequest("?feed=unknown_feed"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an empty feed param", async () => {
    const res = await getGbfs(makeRequest("?feed="));
    expect(res.status).toBe(400);
  });
});

// ─── Happy path — all valid feed names ───────────────────────────────────────

const VALID_FEEDS = [
  "station_information",
  "station_status",
  "system_information",
  "vehicle_types",
  "system_alerts",
] as const;

describe("GET /api/gbfs — valid feeds", () => {
  it.each(VALID_FEEDS)(
    "returns 200 with upstream data for feed '%s'",
    async (feed) => {
      const mockData = { data: { feed } };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const res = await getGbfs(makeRequest(`?feed=${feed}`));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(mockData);
    },
  );

  it("calls fetch with the correct upstream URL for station_information", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await getGbfs(makeRequest("?feed=station_information"));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("station_information.json"),
      expect.any(Object),
    );
  });

  it("calls fetch with the correct upstream URL for station_status", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await getGbfs(makeRequest("?feed=station_status"));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("station_status.json"),
      expect.any(Object),
    );
  });
});

// ─── Upstream errors ──────────────────────────────────────────────────────────

describe("GET /api/gbfs — upstream errors", () => {
  it("returns 502 when the upstream feed responds with a non-OK status", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
    });

    const res = await getGbfs(makeRequest("?feed=station_status"));
    expect(res.status).toBe(502);
  });

  it("includes the upstream status code in the error body", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
    });

    const res = await getGbfs(makeRequest("?feed=station_status"));
    const body = await res.json();
    expect(body.error).toMatch(/503/);
  });

  it("returns 502 when fetch throws a network error", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network failure"));

    const res = await getGbfs(makeRequest("?feed=station_information"));
    expect(res.status).toBe(502);
  });

  it("returns a descriptive error body on network failure", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network failure"));

    const res = await getGbfs(makeRequest("?feed=station_information"));
    const body = await res.json();
    expect(body.error).toMatch(/upstream/i);
  });
});
