// Inventory queries or subscriptions can go here if needed...

export async function addBikeToStation(stationId: string) {
  const res = await fetch("/api/rent-a-bike/stations/inventory/add-bike", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stationId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to add bike");
  }
  return data;
}

export async function removeBikeFromStation(stationId: string) {
  const res = await fetch("/api/rent-a-bike/stations/inventory/remove-bike", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stationId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to remove bike");
  }
  return data;
}
