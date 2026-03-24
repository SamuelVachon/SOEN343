"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Minus, Plus, Settings2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addBikeToStation,
  removeBikeFromStation,
  subscribeToStations,
  type FirestoreStation,
} from "../../lib/rentalFlow";

export default function BikeAdminPage() {
  const [stations, setStations] = useState<FirestoreStation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingStationId, setPendingStationId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToStations((nextStations) => {
      setStations(nextStations);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredStations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return stations;
    }

    return stations.filter((station) =>
      station.name.toLowerCase().includes(normalizedQuery),
    );
  }, [searchQuery, stations]);

  const handleInventoryUpdate = async (
    stationId: string,
    action: "add" | "remove",
  ) => {
    try {
      setErrorMessage("");
      setPendingStationId(stationId);

      if (action === "add") {
        await addBikeToStation(stationId);
      } else {
        await removeBikeFromStation(stationId);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update the station inventory.",
      );
    } finally {
      setPendingStationId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              <Settings2 size={14} />
              Bike inventory admin
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Manage station bikes
            </h1>
            <p className="text-sm text-slate-500">
              Add or remove bikes from any station. Changes are saved in
              Firestore and remain after the app reloads.
            </p>
          </div>

          <Link
            href="/frontend/rent-a-bike"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to rental map
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search station by name"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 sm:max-w-sm"
            />
            <div className="text-sm text-slate-500">
              {loading
                ? "Loading stations..."
                : `${filteredStations.length} stations`}
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,2fr)_120px_120px_180px] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              <div>Station</div>
              <div>Bikes</div>
              <div>Docks</div>
              <div>Actions</div>
            </div>

            {filteredStations.map((station) => {
              const isPending = pendingStationId === station.id;

              return (
                <div
                  key={station.id}
                  className="grid grid-cols-[minmax(0,2fr)_120px_120px_180px] gap-4 border-t border-slate-200 bg-white px-5 py-4 text-sm text-slate-700"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {station.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      Capacity: {station.capacity}
                    </div>
                  </div>
                  <div className="font-semibold text-emerald-700">
                    {station.availableBikes}
                  </div>
                  <div className="font-semibold text-orange-600">
                    {station.availableDocks}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleInventoryUpdate(station.id, "add")}
                      disabled={isPending || station.availableDocks <= 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleInventoryUpdate(station.id, "remove")
                      }
                      disabled={isPending || station.availableBikes <= 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Minus size={14} />
                      )}
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}

            {!loading && filteredStations.length === 0 && (
              <div className="border-t border-slate-200 px-5 py-10 text-center text-sm text-slate-500">
                No stations match your search.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
