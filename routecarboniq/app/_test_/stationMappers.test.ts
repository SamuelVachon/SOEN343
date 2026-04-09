import { mapFirestoreStationToUiStation } from "../frontend/pages/rent-a-bike/utils/stationMappers";
import type { FirestoreStation } from "../frontend/pages/rent-a-bike/services/rentalFlow";

describe("mapFirestoreStationToUiStation", () => {
  const baseStation: FirestoreStation = {
    id: "station-1",
    name: "Milton / Parc",
    capacity: 19,
    lat: 45.5088,
    lon: -73.5878,
    availableBikes: 7,
    availableDocks: 12,
  };

  it("maps all fields to the correct UI Station shape", () => {
    const result = mapFirestoreStationToUiStation(baseStation);

    expect(result).toEqual({
      station_id: "station-1",
      name: "Milton / Parc",
      capacity: 19,
      lat: 45.5088,
      lon: -73.5878,
      num_bikes_available: 7,
      num_docks_available: 12,
    });
  });

  it("uses station.id as station_id (not name or other field)", () => {
    const result = mapFirestoreStationToUiStation({
      ...baseStation,
      id: "abc-99",
    });
    expect(result.station_id).toBe("abc-99");
  });

  it("maps availableBikes to num_bikes_available", () => {
    const result = mapFirestoreStationToUiStation({
      ...baseStation,
      availableBikes: 0,
    });
    expect(result.num_bikes_available).toBe(0);
  });

  it("maps availableDocks to num_docks_available", () => {
    const result = mapFirestoreStationToUiStation({
      ...baseStation,
      availableDocks: 19,
    });
    expect(result.num_docks_available).toBe(19);
  });

  it("passes through undefined lat when not provided", () => {
    const { lat, ...withoutLat } = baseStation;
    const result = mapFirestoreStationToUiStation(
      withoutLat as FirestoreStation,
    );
    expect(result.lat).toBeUndefined();
  });

  it("passes through undefined lon when not provided", () => {
    const { lon, ...withoutLon } = baseStation;
    const result = mapFirestoreStationToUiStation(
      withoutLon as FirestoreStation,
    );
    expect(result.lon).toBeUndefined();
  });

  it("does not leak extra Firestore fields (e.g. updatedAt) into the result", () => {
    const withExtra: FirestoreStation = {
      ...baseStation,
      updatedAt: new Date(),
    };
    const result = mapFirestoreStationToUiStation(withExtra);
    expect(result).not.toHaveProperty("updatedAt");
    expect(result).not.toHaveProperty("availableBikes");
    expect(result).not.toHaveProperty("availableDocks");
    expect(result).not.toHaveProperty("id");
  });

  it("handles a station with zero capacity", () => {
    const result = mapFirestoreStationToUiStation({
      ...baseStation,
      capacity: 0,
      availableBikes: 0,
      availableDocks: 0,
    });
    expect(result.capacity).toBe(0);
    expect(result.num_bikes_available).toBe(0);
    expect(result.num_docks_available).toBe(0);
  });
});
