"use client";

import {useEffect, useState} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";



export default function STMPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchType, setSearchType] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [searchTypeComponent, setActiveSearchComponent] = useState<React.ReactNode>(null);
  
  function handleSearch(e: React.FormEvent<HTMLFormElement>, type: "search" | "directions") {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (type === "search") {
      setSearchType("search");
      setSearchQuery(formData.get("searchQuery") as string);
    }
    if (type === "directions") {
      setSearchType("directions");
      setOrigin(formData.get("origin") as string);
      setDestination(formData.get("destination") as string);
    }
  }

  function showSearchComponent(type: "search" | "directions") {
    if (type === "search") {
      setActiveSearchComponent(
        <form onSubmit={(e) => {handleSearch(e, "search")}}>
          <input name="searchQuery" placeholder="Stations near..." />
          <button type="submit" style={{marginLeft: 8, padding: "6px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer"}}>Search</button>
        </form>
      );
    }
    if (type === "directions") {
      setActiveSearchComponent(
        <form onSubmit={(e) => {handleSearch(e, "directions")}}>
          <input name="origin" placeholder="Enter your starting point" />
          <input name="destination" placeholder="Enter your destination" />
          <button type="submit" style={{marginLeft: 8, padding: "6px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer"}}>Itinerary</button>
        </form>
      );
    }
  }


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
            alignContent: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            flexShrink: 0,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {searchTypeComponent? searchTypeComponent : <span style={{color: "#6b7280"}}>Select an option to get started</span>}
          <div style={{ alignContent: "right", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => showSearchComponent("search")} style={{marginLeft: 8, padding: "6px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer"}}>Search Stations</button>
            <button onClick={() => showSearchComponent("directions")} style={{marginLeft: 8, padding: "6px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer"}}>Itinerary</button> 
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
          style={{ border: 0}}
          referrerPolicy="no-referrer-when-downgrade"
          src={searchType === "directions" ? 
            `https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&origin=${origin}&destination=${destination}&mode=transit` :
            `https://www.google.com/maps/embed/v1/search?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${searchQuery ? `Public Transit near ${searchQuery}` : 'Public Transit near Concordia University'}`}
          allowFullScreen>
        </iframe>
      </div>
  );
}