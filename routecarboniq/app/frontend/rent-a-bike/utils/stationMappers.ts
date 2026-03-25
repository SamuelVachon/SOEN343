import type { FirestoreStation } from "../services/rentalFlow";
import type { Station } from "../types";

export function mapFirestoreStationToUiStation(
  station: FirestoreStation,
): Station {
  return {
    station_id: station.id,
    name: station.name,
    capacity: station.capacity,
    lat: station.lat,
    lon: station.lon,
    num_bikes_available: station.availableBikes,
    num_docks_available: station.availableDocks,
  };
}
