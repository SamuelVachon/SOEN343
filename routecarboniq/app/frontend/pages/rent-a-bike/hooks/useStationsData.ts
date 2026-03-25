import { useEffect, useState } from "react";
import {
  seedStationsIfEmpty,
  subscribeToStations,
} from "../services/rentalFlow";
import type { FeedName, Station, StationStatus } from "../types";
import { mapFirestoreStationToUiStation } from "../utils/stationMappers";

async function fetchFeed(name: FeedName) {
  const res = await fetch(`/api/gbfs?feed=${name}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Feed failed (${name}): ${res.status}`);
  }

  return res.json();
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

        const stationList: Station[] = info?.data?.stations ?? [];
        const statusList: StationStatus[] = status?.data?.stations ?? [];
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
