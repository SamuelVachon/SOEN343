export interface Station {
  station_id: string;
  name: string;
  capacity: number;
  lat?: number;
  lon?: number;
  num_bikes_available: number;
  num_docks_available: number;
}

export interface StationStatus {
  station_id: string;
  num_bikes_available: number;
  num_docks_available: number;
  num_ebikes_available?: number;
  is_installed?: boolean;
  is_renting?: boolean;
  is_returning?: boolean;
}

export type FeedName = "station_information" | "station_status";

export interface CompletedRentalSummary {
  returnStationName: string;
  actualDurationMinutes: number;
  finalCharge: number;
}
