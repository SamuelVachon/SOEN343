"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Leaf } from "lucide-react";
import Form from "next/form";

export default function STMPage() {
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
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/90 text-white shadow-lg shadow-emerald-200/50">
            <Leaf size={16} fill="currentColor" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
            Route<span className="text-emerald-500/80">Carbon</span>IQ
          </p>
        </div>
        <form
          onSubmit={(e) => {
            setAddress(e.target.address.value);
            e.preventDefault();
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
