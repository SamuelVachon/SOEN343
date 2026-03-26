import { useEffect, useState } from "react";
import { AnalyticsService } from "../../../services/AnalyticsService";
import {
  seedStationsIfEmpty,
  subscribeToStations,
} from "../services/rentalFlow";
import type { FeedName, Station, StationStatus } from "../types";
import { mapFirestoreStationToUiStation } from "../utils/stationMappers";

const LIVE_BIXI_TRACKING_DEDUPE_KEY = "analytics:live-bixi-feed:last-tracked-at";
const LIVE_BIXI_TRACKING_DEDUPE_MS = 15000;

async function fetchFeed(name: FeedName) {
  const t0 = Date.now();
  const res = await fetch(`/api/gbfs?feed=${name}`, { cache: "no-store" });
  const latency = Date.now() - t0;
  
  if (!res.ok) {
    throw new Error(`Feed failed (${name}): ${res.status}`);
  }

  return {
    data: await res.json(),
    latency,
  };
}

function trackLiveBixiFeedOnce(latencyMs: number) {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const lastTrackedAt = Number(
    window.sessionStorage.getItem(LIVE_BIXI_TRACKING_DEDUPE_KEY) || 0,
  );

  if (now - lastTrackedAt < LIVE_BIXI_TRACKING_DEDUPE_MS) {
    return;
  }

  window.sessionStorage.setItem(LIVE_BIXI_TRACKING_DEDUPE_KEY, String(now));
  AnalyticsService.getInstance().trackEvent("API_REQUEST_COMPLETED", {
    latencyMs,
    endpoint: "Live Bixi Station Feed",
  });
}

export function useStationsData() {
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsLoadedFromFirestore, setStationsLoadedFromFirestore] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToStations((firestoreStations) => {
      if (firestoreStations.length === 0) {
        setStationsLoadedFromFirestore(false);
        return;
      }

      setStations(firestoreStations.map(mapFirestoreStationToUiStation));
      setStationsLoadedFromFirestore(true);
      setLastUpdated(new Date());
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [info, status] = await Promise.all([
          fetchFeed("station_information"),
          fetchFeed("station_status"),
        ]);

        // Count a Bixi page load as a single feature usage event.
        trackLiveBixiFeedOnce(info.latency + status.latency);

        const stationList: Station[] = info.data?.data?.stations ?? [];
        const statusList: StationStatus[] = status.data?.data?.stations ?? [];
        const statusMap = new Map(
          statusList.map((station) => [station.station_id, station]),
        );

        await seedStationsIfEmpty(
          stationList.map((station) => {
            const stationStatus = statusMap.get(station.station_id);
            return {
              ...station,
              num_bikes_available: stationStatus?.num_bikes_available ?? 0,
              num_docks_available:
                stationStatus?.num_docks_available ?? station.capacity,
            };
          }),
        );
      } catch (error) {
        console.error(error);
      } finally {
        if (stationsLoadedFromFirestore) {
          setLoading(false);
        }
      }
    }

    if (!stationsLoadedFromFirestore) {
      void load();
    }
  }, [stationsLoadedFromFirestore]);

  return {
    stations,
    loading,
    lastUpdated,
  };
}
