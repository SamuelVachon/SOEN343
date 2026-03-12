import { NextResponse } from "next/server";

const FEEDS = {
  station_information:
    "https://gbfs.velobixi.com/gbfs/2-2/en/station_information.json",
  station_status: "https://gbfs.velobixi.com/gbfs/2-2/en/station_status.json",
  system_information:
    "https://gbfs.velobixi.com/gbfs/2-2/en/system_information.json",
  vehicle_types: "https://gbfs.velobixi.com/gbfs/2-2/en/vehicle_types.json",
  system_alerts: "https://gbfs.velobixi.com/gbfs/2-2/en/system_alerts.json",
} as const;

type FeedName = keyof typeof FEEDS;

function isFeedName(value: string): value is FeedName {
  return value in FEEDS;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const feed = searchParams.get("feed");

  if (!feed || !isFeedName(feed)) {
    return NextResponse.json({ error: "Invalid feed" }, { status: 400 });
  }

  try {
    const upstream = await fetch(FEEDS[feed], {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream request failed with ${upstream.status}` },
        { status: 502 },
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach upstream feed" },
      { status: 502 },
    );
  }
}
