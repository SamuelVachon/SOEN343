/**
 * maps/embed-url/route.ts — unit tests
 *
 * Covers: search URL construction, directions URL construction,
 * fallback behaviour when direction params are missing, mode and q
 * param encoding, and missing API key behaviour.
 */

import { GET as getEmbedUrl } from "@/app/api/maps/embed-url/route";

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeRequest(search: string): Request {
  return new Request(`http://localhost/api/maps/embed-url${search}`);
}

// Store original env and restore after each test
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "TEST_API_KEY",
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

// ─── Search URL ───────────────────────────────────────────────────────────────

describe("GET /api/maps/embed-url — search mode", () => {
  it("returns 200 with a url field", async () => {
    const res = await getEmbedUrl(makeRequest(""));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("url");
  });

  it("returns a search embed URL when type is omitted", async () => {
    const res = await getEmbedUrl(makeRequest(""));
    const { url } = await res.json();
    expect(url).toContain("/maps/embed/v1/search");
  });

  it("returns a search embed URL when type=search", async () => {
    const res = await getEmbedUrl(makeRequest("?type=search&q=Concordia+University"));
    const { url } = await res.json();
    expect(url).toContain("/maps/embed/v1/search");
  });

  it("URL-encodes the q parameter", async () => {
    const res = await getEmbedUrl(makeRequest("?q=Montreal, QC"));
    const { url } = await res.json();
    // Space should be encoded — must not appear raw
    expect(url).not.toMatch(/q=Montreal, QC/);
  });

  it("defaults q to 'Montreal,+QC' when q is omitted", async () => {
    const res = await getEmbedUrl(makeRequest(""));
    const { url } = await res.json();
    expect(url).toContain(encodeURIComponent("Montreal,+QC"));
  });

  it("includes the API key in the search URL", async () => {
    const res = await getEmbedUrl(makeRequest(""));
    const { url } = await res.json();
    expect(url).toContain("key=TEST_API_KEY");
  });
});

// ─── Directions URL ───────────────────────────────────────────────────────────

describe("GET /api/maps/embed-url — directions mode", () => {
  it("returns a directions embed URL when type=directions, origin and destination are set", async () => {
    const res = await getEmbedUrl(
      makeRequest("?type=directions&origin=Montreal&destination=Quebec+City"),
    );
    const { url } = await res.json();
    expect(url).toContain("/maps/embed/v1/directions");
  });

  it("includes origin and destination in the directions URL", async () => {
    const res = await getEmbedUrl(
      makeRequest("?type=directions&origin=Montreal&destination=Quebec"),
    );
    const { url } = await res.json();
    expect(url).toContain(encodeURIComponent("Montreal"));
    expect(url).toContain(encodeURIComponent("Quebec"));
  });

  it("includes the mode param in the directions URL", async () => {
    const res = await getEmbedUrl(
      makeRequest("?type=directions&origin=A&destination=B&mode=bicycling"),
    );
    const { url } = await res.json();
    expect(url).toContain("mode=bicycling");
  });

  it("defaults mode to 'transit' when not specified", async () => {
    const res = await getEmbedUrl(
      makeRequest("?type=directions&origin=A&destination=B"),
    );
    const { url } = await res.json();
    expect(url).toContain("mode=transit");
  });

  it("falls back to search URL when type=directions but origin is missing", async () => {
    const res = await getEmbedUrl(
      makeRequest("?type=directions&destination=Quebec+City"),
    );
    const { url } = await res.json();
    expect(url).toContain("/maps/embed/v1/search");
  });

  it("falls back to search URL when type=directions but destination is missing", async () => {
    const res = await getEmbedUrl(
      makeRequest("?type=directions&origin=Montreal"),
    );
    const { url } = await res.json();
    expect(url).toContain("/maps/embed/v1/search");
  });

  it("includes the API key in the directions URL", async () => {
    const res = await getEmbedUrl(
      makeRequest("?type=directions&origin=A&destination=B"),
    );
    const { url } = await res.json();
    expect(url).toContain("key=TEST_API_KEY");
  });
});

// ─── Missing API key ──────────────────────────────────────────────────────────

describe("GET /api/maps/embed-url — missing API key", () => {
  it("still returns 200 even when the API key env var is absent", async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const res = await getEmbedUrl(makeRequest(""));
    expect(res.status).toBe(200);
    consoleSpy.mockRestore();
  });

  it("produces a URL with an empty key when the env var is absent", async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const res = await getEmbedUrl(makeRequest(""));
    const { url } = await res.json();
    expect(url).toContain("key=");
    consoleSpy.mockRestore();
  });
});
