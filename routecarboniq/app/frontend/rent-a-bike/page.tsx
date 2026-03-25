"use client";

import Link from "next/link";
import { Leaf, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRideElapsedTimer } from "./hooks/useRideElapsedTimer";
import { useStationsData } from "./hooks/useStationsData";
import { subscribeToAdminAccess } from "../lib/adminAccess";
import { useAuth } from "../src/context/AuthContext";
import {
  completeRental,
  createRental,
  getOrCreateRentalUserKey,
  startRide,
  subscribeToOpenRental,
  timestampToMillis,
  type RentalRecord,
} from "./services/rentalFlow";
import ReservationModal, { type ReservationStep } from "./ReservationModal";
import type { CompletedRentalSummary, Station } from "./types";

type LeafletMapInstance = object;

interface LeafletMarkerInstance {
  addTo: (map: LeafletMapInstance) => LeafletMarkerInstance;
  bindPopup: (content: string) => LeafletMarkerInstance;
  openPopup: () => void;
  remove: () => void;
}

interface LeafletApi {
  map: (element: HTMLDivElement) => {
    setView: (
      coordinates: [number, number],
      zoom: number,
    ) => LeafletMapInstance;
  };
  tileLayer: (
    url: string,
    options: { attribution: string; maxZoom: number },
  ) => {
    addTo: (map: LeafletMapInstance) => void;
  };
  divIcon: (options: {
    className: string;
    html: string;
    iconSize: [number, number];
    iconAnchor: [number, number];
  }) => unknown;
  marker: (
    coordinates: [number, number],
    options: { icon: unknown },
  ) => LeafletMarkerInstance;
}

declare global {
  interface Window {
    L?: LeafletApi;
    triggerReserve?: (name: string, stationId: string) => void;
  }
}

export default function BixiMap() {
  const { user } = useAuth();
  const [guestRentalUserKey] = useState(() =>
    typeof window === "undefined" ? null : getOrCreateRentalUserKey(),
  );
  const [canManageBikes, setCanManageBikes] = useState(false);
  const { stations, loading, lastUpdated } = useStationsData();
  const [searchQuery, setSearchQuery] = useState("");
  const [reservationStep, setReservationStep] =
    useState<ReservationStep>("idle");
  const [processingMessage, setProcessingMessage] = useState(
    "Processing payment...",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedStationName, setSelectedStationName] = useState("");
  const [selectedStationId, setSelectedStationId] = useState("");
  const [returnStationId, setReturnStationId] = useState("");
  const [activeRental, setActiveRental] = useState<RentalRecord | null>(null);
  const rideElapsedSeconds = useRideElapsedTimer(activeRental);
  const [completedRental, setCompletedRental] =
    useState<CompletedRentalSummary | null>(null);
  const [modalSessionKey, setModalSessionKey] = useState(0);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<LeafletMapInstance | null>(null);
  const markersRef = useRef<Map<string, LeafletMarkerInstance>>(new Map());

  const rentalUserKey = user?.uid ? `user:${user.uid}` : guestRentalUserKey;
  const actualRideDurationMinutes = activeRental
    ? Math.max(
        1,
        Math.ceil(
          (Date.now() -
            (timestampToMillis(activeRental.startedAt) ?? Date.now())) /
            60_000,
        ),
      )
    : 0;
  const actualRideCost = activeRental
    ? Number((1.6 + actualRideDurationMinutes * 0.21).toFixed(2))
    : 0;

  useEffect(() => {
    const unsubscribe = subscribeToAdminAccess(user?.uid, setCanManageBikes);
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!rentalUserKey) {
      return;
    }

    const unsubscribe = subscribeToOpenRental(rentalUserKey, (rental) => {
      setActiveRental(rental);

      if (!rental) {
        if (reservationStep === "active" || reservationStep === "returning") {
          setReservationStep("idle");
        }
        return;
      }

      setSelectedStationId(rental.startStationId);
      setSelectedStationName(rental.startStationName);

      if (reservationStep === "idle") {
        setReservationStep("active");
      }
    });

    return () => unsubscribe();
  }, [rentalUserKey, reservationStep]);

  useEffect(() => {
    window.triggerReserve = (name: string, stationId: string) => {
      if (activeRental) {
        setReservationStep("active");
        return;
      }

      setSelectedStationName(name);
      setSelectedStationId(stationId);
      setReturnStationId("");
      setCompletedRental(null);
      setErrorMessage("");
      setModalSessionKey((current) => current + 1);
      setReservationStep("form");
    };

    return () => {
      delete window.triggerReserve;
    };
  }, [activeRental]);

  // Init map once
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const initMap = () => {
      const L = window.L;
      if (!mapRef.current || !L || leafletMapRef.current) return;
      leafletMapRef.current = L.map(mapRef.current).setView(
        [45.52, -73.58],
        13,
      );
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "© OpenStreetMap © CARTO",
          maxZoom: 19,
        },
      ).addTo(leafletMapRef.current);
    };

    if (window.L) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, []);

  // Update markers when data changes
  useEffect(() => {
    const L = window.L;
    if (!L || !leafletMapRef.current || stations.length === 0) return;
    const mapInstance = leafletMapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    stations.forEach((s) => {
      if (!s.lat || !s.lon) return;
      const bikes = s.num_bikes_available ?? 0;
      const docks = s.num_docks_available ?? 0;
      const canReserve = bikes > 0 && !activeRental;

      const color = bikes > 5 ? "#16a34a" : bikes > 0 ? "#ea580c" : "#9ca3af";

      const icon = L.divIcon({
        className: "",
        html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([s.lat, s.lon], { icon }).addTo(mapInstance)
        .bindPopup(`
        <div style="font-family:'Nunito',sans-serif;padding:4px;min-width:180px">
          <div style="font-weight:700;margin-bottom:8px;font-size:14px;color:#1e293b">${s.name}</div>
          
          <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px">
            <div style="font-size:12px;color:#475569;display:flex;justify-content:space-between">
              <span>🚲 Available Bikes</span>
              <span style="font-weight:700;color:${bikes > 0 ? "#16a34a" : "#ef4444"}">${bikes}</span>
            </div>
            <div style="font-size:12px;color:#475569;display:flex;justify-content:space-between">
              <span>🅿 Docks</span>
              <span style="font-weight:700;color:#64748b">${docks}</span>
            </div>
          </div>
          
          <button
            ${canReserve ? `onclick="triggerReserve('${s.name.replace(/'/g, "\\'")}', '${s.station_id}')"` : "disabled"}
            style="
              width:100%;
              background:${canReserve ? "#10b981" : "#94a3b8"};
              color:white;
              border:none;
              padding:8px;
              border-radius:8px;
              font-weight:600;
              font-size:12px;
              cursor:${canReserve ? "pointer" : "not-allowed"};
            "
            ${canReserve ? `onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'"` : ""}
          >
            ${activeRental ? "Ride In Progress" : canReserve ? "Reserve Bike" : "No Bikes Available"}
          </button>
        </div>
      `);

      markersRef.current.set(s.station_id, marker);
    });
  }, [activeRental, stations]);

  const totalBikes = stations.reduce(
    (total, station) => total + (station.num_bikes_available ?? 0),
    0,
  );

  const totalDocks = stations.reduce(
    (total, station) => total + (station.num_docks_available ?? 0),
    0,
  );

  const handleConfirmReservation = async () => {
    if (!selectedStationId || !rentalUserKey) {
      setErrorMessage("Unable to start the rental right now.");
      return;
    }

    const currentStation = stations.find(
      (station) => station.station_id === selectedStationId,
    );
    if (!currentStation || currentStation.num_bikes_available <= 0) {
      setErrorMessage("This station is no longer available.");
      return;
    }

    try {
      setErrorMessage("");
      setProcessingMessage("Creating your reservation...");
      setReservationStep("processing");

      const rental = await createRental({
        userKey: rentalUserKey,
        userId: user?.uid ?? null,
        userEmail: user?.email ?? null,
        startStationId: selectedStationId,
        startStationName: selectedStationName,
        serviceFee: 1.6,
        pricePerMinute: 0.21,
      });

      setActiveRental(rental);
      setReservationStep("success");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Firestore is not ready yet. Enable Firestore and try again.",
      );
      setReservationStep("form");
    }
  };

  const handleStartRide = async () => {
    if (!activeRental) {
      return;
    }
    await startRide(activeRental.id);
    setReservationStep("active");
  };

  const handleReturnBike = async () => {
    if (!activeRental) {
      return;
    }

    if (reservationStep === "active") {
      setErrorMessage("");
      setReservationStep("returning");
      return;
    }

    if (!returnStationId) {
      setErrorMessage("Please choose a destination station.");
      return;
    }

    const returnStation = stations.find(
      (station) => station.station_id === returnStationId,
    );
    if (!returnStation) {
      setErrorMessage("Selected destination station was not found.");
      return;
    }

    try {
      setErrorMessage("");
      setProcessingMessage("Processing payment and completing your rental...");
      setReservationStep("processing");

      const result = await completeRental({
        rentalId: activeRental.id,
        returnStationId,
        returnStationName: returnStation.name,
      });

      setCompletedRental({
        returnStationName: returnStation.name,
        actualDurationMinutes: result.actualDurationMinutes,
        finalCharge: result.finalCharge,
      });
      setReturnStationId("");
      setActiveRental(null);
      setReservationStep("completed");
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to complete the rental.");
      setReservationStep("returning");
    }
  };

  const handleCloseModal = () => {
    setErrorMessage("");
    setModalSessionKey((current) => current + 1);

    if (reservationStep === "completed") {
      setCompletedRental(null);
      setSelectedStationId("");
      setSelectedStationName("");
      setReturnStationId("");
    }

    setReservationStep("idle");
  };

  const filteredStations = searchQuery.trim()
    ? stations
        .filter((s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
        )
        .slice(0, 5)
    : [];

  const handleSearchSelect = (station: Station) => {
    setSearchQuery("");
    if (!station.lat || !station.lon) return;

    const map = leafletMapRef.current as unknown as {
      flyTo: (latlng: [number, number], zoom: number) => void;
    } | null;

    map?.flyTo([station.lat, station.lon], 17);

    window.setTimeout(() => {
      markersRef.current.get(station.station_id)?.openPopup();
    }, 800);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          flexShrink: 0,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/90 text-white shadow-lg shadow-emerald-200/50">
            <Leaf size={16} fill="currentColor" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
            Route<span className="text-emerald-500/80">Carbon</span>IQ
          </p>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          {[
            { label: "Bikes", val: totalBikes, color: "#16a34a" },
            { label: "Docks", val: totalDocks, color: "#ea580c" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div
                style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}
              >
                {loading ? "—" : val}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {canManageBikes && (
            <Link
              href="/frontend/rent-a-bike/admin"
              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:border-emerald-300 hover:text-emerald-600"
            >
              Manage bikes
            </Link>
          )}
          {/* Legend */}
          <div
            style={{ display: "flex", gap: 12, fontSize: 11, color: "#6b7280" }}
          >
            {[
              { color: "#16a34a", label: "6+ bikes" },
              { color: "#ea580c", label: "1–5 bikes" },
              { color: "#9ca3af", label: "Empty" },
            ].map(({ color, label }) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: color,
                  }}
                />
                {label}
              </div>
            ))}
          </div>
          {lastUpdated && (
            <div style={{ fontSize: 11, color: "#d1d5db" }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          transform: "translateX(-50%)",
          width: "90%",
          height: "48px",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0px 16px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          border: "1px solid #e5e7eb",
        }}
      >
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          placeholder="Enter a station name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: 15,
            color: "#1e293b",
            background: "transparent",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              fontSize: 18,
              color: "#94a3b8",
              cursor: "pointer",
              border: "none",
              background: "none",
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Search Dropdown */}
      {filteredStations.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 136,
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            zIndex: 999,
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          {filteredStations.map((station) => {
            return (
              <button
                key={station.station_id}
                onClick={() => handleSearchSelect(station)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "10px 16px",
                  border: "none",
                  borderBottom: "1px solid #f1f5f9",
                  background: "white",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f8fafc")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "white")
                }
              >
                <span style={{ fontSize: 14, color: "#1e293b" }}>
                  {station.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Map */}
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.7)",
            fontSize: 16,
            color: "#6b7280",
          }}
        >
          Loading stations...
        </div>
      )}
      <div ref={mapRef} style={{ flex: 1 }} />

      <ReservationModal
        key={modalSessionKey}
        reservationStep={reservationStep}
        selectedStationName={selectedStationName}
        stationOptions={stations}
        rideElapsedSeconds={rideElapsedSeconds}
        returnStationId={returnStationId}
        actualRideDurationMinutes={actualRideDurationMinutes}
        actualRideCost={actualRideCost}
        processingMessage={processingMessage}
        errorMessage={errorMessage}
        completedRental={completedRental}
        onReturnStationChange={setReturnStationId}
        onConfirm={handleConfirmReservation}
        onReturn={handleReturnBike}
        onStartRide={handleStartRide}
        onClose={handleCloseModal}
      />
    </div>
  );
}
