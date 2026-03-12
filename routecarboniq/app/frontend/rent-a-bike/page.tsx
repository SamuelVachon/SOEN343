"use client";

import { Leaf } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type Filter = "all" | "available" | "docks" | "electric";
type ActiveTab = "stations" | "system" | "alerts";

interface Station {
  station_id: string;
  name: string;
  capacity: number;
  lat?: number;
  lon?: number;
}

interface StationStatus {
  station_id: string;
  num_bikes_available: number;
  num_docks_available: number;
  num_ebikes_available?: number;
  is_installed?: boolean;
  is_renting?: boolean;
  is_returning?: boolean;
}

interface AlertText {
  translation?: Array<{ value?: string }>;
}

interface SystemAlert {
  alert_id?: string;
  alert_type?: string;
  description?: AlertText;
  summary?: AlertText;
}

const FEEDS = {
  station_information:
    "https://gbfs.velobixi.com/gbfs/2-2/en/station_information.json",
  station_status: "https://gbfs.velobixi.com/gbfs/2-2/en/station_status.json",
  system_information:
    "https://gbfs.velobixi.com/gbfs/2-2/en/system_information.json",
  vehicle_types: "https://gbfs.velobixi.com/gbfs/2-2/en/vehicle_types.json",
  system_alerts: "https://gbfs.velobixi.com/gbfs/2-2/en/system_alerts.json",
};

async function fetchFeed(name: keyof typeof FEEDS) {
  const res = await fetch(`/api/gbfs?feed=${name}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Feed failed (${name}): ${res.status}`);
  return res.json();
}

export default function BixiMap() {
  const [stations, setStations] = useState<Station[]>([]);
  const [statuses, setStatuses] = useState<Record<string, StationStatus>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Fetch data
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
        const statusMap: Record<string, StationStatus> = {};
        for (const s of statusList) statusMap[s.station_id] = s;
        setStations(stationList);
        setStatuses(statusMap);
        setLastUpdated(new Date());
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

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
      const L = (window as any).L;
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

    if ((window as any).L) {
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
    const L = (window as any).L;
    if (!L || !leafletMapRef.current || stations.length === 0) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    stations.forEach((s) => {
      if (!s.lat || !s.lon) return;
      const st = statuses[s.station_id];
      const bikes = st?.num_bikes_available || 0;
      const ebikes = st?.num_ebikes_available || 0;
      const docks = st?.num_docks_available || 0;

      const color = bikes > 5 ? "#16a34a" : bikes > 0 ? "#ea580c" : "#9ca3af";

      const icon = L.divIcon({
        className: "",
        html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([s.lat, s.lon], { icon }).addTo(
        leafletMapRef.current,
      ).bindPopup(`
          <div style="font-family:'Nunito',sans-serif;padding:4px;min-width:160px">
            <div style="font-weight:600;margin-bottom:6px;font-size:13px">${s.name}</div>
            <div style="font-size:12px;color:#555">🚲 ${bikes} bikes</div>
            
            <div style="font-size:12px;color:#555">🅿 ${docks} free docks</div>
            <div style="font-size:11px;color:#aaa;margin-top:4px">Capacity: ${s.capacity}</div>
          </div>
  
        `);
      //<div style="font-size:12px;color:#555">⚡ ${ebikes} e-bikes</div>

      markersRef.current.push(marker);
    });
  }, [stations, statuses]);

  const totalBikes = Object.values(statuses).reduce(
    (a, s) => a + (s.num_bikes_available || 0),
    0,
  );

  const totalDocks = Object.values(statuses).reduce(
    (a, s) => a + (s.num_docks_available || 0),
    0,
  );

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
            //{ label: "E-Bikes", val: totalEbikes, color: "#2563eb" },
            { label: "Free Docks", val: totalDocks, color: "#ea580c" },
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
    </div>
  );
}
