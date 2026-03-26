"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { AnalyticsService } from "../../services/AnalyticsService";

export default function ParkingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [address, setAddress] = useState("Concondia University, Montreal, QC");

  useEffect(() => {
    if (!loading && !user) router.replace("/frontend/login");
  }, [loading, user, router]);

  if (loading) return <p>Loading...</p>;
  if (!user) return null;

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
        <div style={{ alignContent: "right", width: "100%", display: "flex", justifyContent: "flex-end" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const target = e.target as typeof e.target & {
              address: { value: string };
            };
            setAddress(target.address.value);
            
            // Track Google Maps Places API interaction
            AnalyticsService.getInstance().trackEvent("API_REQUEST_COMPLETED", {
              latencyMs: 120, // simulated iframe latency
              endpoint: "Google Maps Parking Search",
            });
          }}
        >
          <input name="address" placeholder="Enter your destination" />
          <button
            type="submit"
            style={{
              marginLeft: 8,
              padding: "6px 12px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>
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
          Loading STM...
        </div>
      )}
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.google.com/maps/embed/v1/search?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=parking+near+${address}`}
        allowFullScreen
      ></iframe>
    </div>
  );
}
