"use client";

import { SubmitEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { APIProvider, Map, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { on } from "events";

enum TravelMode {
    DRIVING = "DRIVING",
    WALKING = "WALKING",
    BICYCLING = "BICYCLING",
    TRANSIT = "TRANSIT",
}

interface DirectionsRequest {
    origin: String
    destination: String
    travelMode: TravelMode
}


function Directions(propsReq: { directionsRequest: DirectionsRequest, onRouteCalculated?: (result: google.maps.DirectionsResult) => void }) {
    const { directionsRequest, onRouteCalculated } = propsReq;

    const map = useMap();
    const routesLibrary = useMapsLibrary("routes");
    const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
    const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

    // Initialize services when the library and map are ready
    useEffect(() => {
        if (!routesLibrary || !map) return;
        setDirectionsService(new routesLibrary.DirectionsService());
        setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map }));
    }, [routesLibrary, map]);

    // Request directions
    useEffect(() => {
        if (!directionsService || !directionsRenderer) return;
        let origin = directionsRequest.origin.trim() + ", Montreal, QC";
        let destination = directionsRequest.destination.trim() + ", Montreal, QC";
        let travelMode = directionsRequest.travelMode;
        directionsService.route({
            origin: origin,
            destination: destination,
            travelMode: travelMode,
            unitSystem: google.maps.UnitSystem.METRIC,
            region: "CA",
        }).then((response: google.maps.DirectionsResult) => {
            directionsRenderer.setDirections(response);
            onRouteCalculated?.(response);
        });
    }, [directionsService, directionsRenderer, directionsRequest]);
    return null;
}

export default function PlanTrip() {
    // Authentication and Routing
    const { user, loading } = useAuth();
    const router = useRouter();

    // State for Map and Directions
    const [position, setPosition] = useState<{ lat: number; lng: number }>({ lat: 45.5017, lng: -73.5673 });
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    const [directionsRequest, setDirectionsRequest] = useState<DirectionsRequest>({
        origin: "",
        destination: "",
        travelMode: TravelMode.TRANSIT,
    });

    //Example of values that can be extracted from the directions result and displayed on the UI
    const [distanceValue, setDistanceValue] = useState<number>(0);
    const [durationValue, setDurationValue] = useState<number>(0);
    const [carbonEmission, setCarbonEmission] = useState<number | string>(0);

    // Redirect unauthenticated users to home
    useEffect(() => {
        if (!loading && !user) router.replace("/");
    }, [loading, user, router]);

    if (loading) return <p>Loading...</p>;
    if (!user) return null;

    // Handle form submission to request directions
    function handleSearch(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const origin = formData.get('origin') as string;
        const destination = formData.get('destination') as string;
        const travelMode = formData.get('travelMode') as TravelMode;
        setDirectionsRequest({ origin, destination, travelMode });
    }

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
                <div style={{ alignContent: "right", display: "flex", justifyContent: "flex-end", width: "100%" }}>
                    <form onSubmit={(e) => { handleSearch(e) }} > style={{ marginRight: "40px" }}>
                        <input name="origin" placeholder="Enter your starting point" />
                        <input name="destination" placeholder="Enter your destination" />
                        <select name="travelMode">
                            <option value={TravelMode.DRIVING}>Driving</option>
                            <option value={TravelMode.WALKING}>Walking</option>
                            <option value={TravelMode.BICYCLING}>Bicycling</option>
                            <option value={TravelMode.TRANSIT}>Transit</option>
                        </select>
                        <button type="submit" style={{ marginLeft: 8, padding: "6px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>Itinerary</button>
                    </form>
                    <div>
                        <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Distance: {(distanceValue / 1000).toFixed(2)} km</p>
                        <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Duration: {(durationValue / 60).toFixed(2)} mins</p>
                        <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
                            Estimated CO2: {typeof carbonEmission === "string" ? carbonEmission : (carbonEmission >= 1000 ? (carbonEmission / 1000).toFixed(2) + " kg" : carbonEmission.toFixed(2) + " g")}
                        </p>
                    </div>
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
                    Loading Map...
                </div>
            )}

            <APIProvider apiKey={apiKey} onLoad={() => { }}>
                <Map defaultCenter={position} defaultZoom={10} mapId="DEMO_MAP_ID">
                    <Directions directionsRequest={directionsRequest} onRouteCalculated={(result) => {
                        const leg = result.routes[0]?.legs[0];
                        setDistanceValue(leg?.distance?.value || 0);
                        setDurationValue(leg?.duration?.value || 0);

                        // Carbon Emission estimation logic 
                        let emission: number | string = 0;
                        if (directionsRequest.travelMode === TravelMode.BICYCLING || directionsRequest.travelMode === TravelMode.WALKING) {
                            emission = "Negligible";
                        } else if (directionsRequest.travelMode === TravelMode.DRIVING) {
                            // Assuming average 200g CO2 per km for driving
                            emission = ((leg?.distance?.value || 0) / 1000) * 200;
                        } else if (directionsRequest.travelMode === TravelMode.TRANSIT) {
                            let totalTransitEmission = 0;
                            if (leg?.steps) {
                                leg.steps.forEach(step => {
                                    if (step.travel_mode === "TRANSIT" && step.transit) {
                                        const vehicleType = step.transit.line.vehicle.type;
                                        const stepDistanceKm = (step.distance?.value || 0) / 1000;

                                        if (vehicleType === "BUS" || vehicleType === "INTERCITY_BUS") {
                                            // Assuming average 100g CO2 per km for bus
                                            totalTransitEmission += stepDistanceKm * 100;
                                        } else if (["SUBWAY", "TRAIN", "COMMUTER_TRAIN", "TRAM", "HEAVY_RAIL"].includes(vehicleType)) {
                                            // Assuming average 15g CO2 per km for metro/REM
                                            totalTransitEmission += stepDistanceKm * 15;
                                        }
                                    }
                                });
                            }
                            emission = totalTransitEmission;
                        }
                        setCarbonEmission(emission);
                    }} />
                </Map>
            </APIProvider>
        </div>
    );
}
