"use client";

import { SubmitEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { APIProvider, Map, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { Bike, Bus, Car, Footprints } from "lucide-react";
import { on } from "events";

enum TravelMode {
    DRIVING = "DRIVING",
    WALKING = "WALKING",
    BICYCLING = "BICYCLING",
    TRANSIT = "TRANSIT",
}

interface DirectionsRequest {
    origin: string;
    destination: string;
    travelMode: TravelMode;
}

interface RouteData {
    distance: number;
    duration: number;
    carbonEmission: number; // in grams
}

function Directions(propsReq: { 
    directionsRequest: DirectionsRequest, 
    visible: boolean,
    onRouteCalculated?: (result: google.maps.DirectionsResult) => void 
}) {
    const { directionsRequest, visible, onRouteCalculated } = propsReq;

    const map = useMap();
    const routesLibrary = useMapsLibrary("routes");
    const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
    const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

    // Initialize services when the library and map are ready
    useEffect(() => {
        if (!routesLibrary || !map) return;
        setDirectionsService(new routesLibrary.DirectionsService());
        setDirectionsRenderer(new routesLibrary.DirectionsRenderer()); // don't pass map yet
    }, [routesLibrary, map]);

    // Handle visibility
    useEffect(() => {
        if (!directionsRenderer || !map) return;
        directionsRenderer.setMap(visible ? map : null);
    }, [directionsRenderer, map, visible]);

    // Request directions
    useEffect(() => {
        if (!directionsService || !directionsRenderer) return;
        if (!directionsRequest.origin || !directionsRequest.destination) return;
        
        let origin = directionsRequest.origin.trim() + ", Montreal, QC";
        let destination = directionsRequest.destination.trim() + ", Montreal, QC";
        let travelMode = directionsRequest.travelMode;
        
        directionsService.route({
            origin: origin,
            destination: destination,
            travelMode: travelMode,
            unitSystem: google.maps.UnitSystem.METRIC,
            region: "CA",
        }).then((response) => {
            directionsRenderer.setDirections(response);
            if (onRouteCalculated) {
                onRouteCalculated(response);
            }
        }).catch(err => {
            console.error("Directions request failed for mode " + travelMode, err);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [directionsService, directionsRenderer, directionsRequest.origin, directionsRequest.destination, directionsRequest.travelMode]);
    return null;
}

function TransitMapLayer({ visible }: { visible: boolean }) {
    const map = useMap();
    const [transitLayer, setTransitLayer] = useState<google.maps.TransitLayer | null>(null);

    useEffect(() => {
        if (!map) return;
        const layer = new google.maps.TransitLayer();
        setTransitLayer(layer);
        
        return () => {
            layer.setMap(null);
        };
    }, [map]);

    useEffect(() => {
        if (!transitLayer || !map) return;
        transitLayer.setMap(visible ? map : null);
    }, [transitLayer, map, visible]);

    return null;
}

export default function PlanTrip() {
    // Authentication and Routing
    const { user, loading } = useAuth();
    const router = useRouter();

    // State for Map and Directions
    const [position, setPosition] = useState<{ lat: number; lng: number }>({ lat: 45.5017, lng: -73.5673 });
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    
    // UI state
    const [searchOrigin, setSearchOrigin] = useState<string>("");
    const [searchDestination, setSearchDestination] = useState<string>("");
    const [selectedMode, setSelectedMode] = useState<TravelMode>(TravelMode.TRANSIT);
    
    const [routeData, setRouteData] = useState<Record<TravelMode, RouteData | null>>({
        [TravelMode.DRIVING]: null,
        [TravelMode.WALKING]: null,
        [TravelMode.BICYCLING]: null,
        [TravelMode.TRANSIT]: null,
    });

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
        setSearchOrigin(formData.get('origin') as string);
        setSearchDestination(formData.get('destination') as string);
    }

    const calculateCarbonEmission = (mode: TravelMode, distance: number, steps: google.maps.DirectionsStep[]) => {
        if (mode === TravelMode.BICYCLING || mode === TravelMode.WALKING) return 0;
        if (mode === TravelMode.DRIVING) return (distance / 1000) * 200; // 200g per km
        
        // Transit
        let total = 0;
        steps.forEach(step => {
            if (step.travel_mode === "TRANSIT" && step.transit) {
                const vehicleType = step.transit.line.vehicle.type as string;
                const distKm = (step.distance?.value || 0) / 1000;
                if (vehicleType === "BUS" || vehicleType === "INTERCITY_BUS") {
                    total += distKm * 100;
                } else if (["SUBWAY", "TRAIN", "COMMUTER_TRAIN", "TRAM", "HEAVY_RAIL"].includes(vehicleType)) {
                    total += distKm * 15;
                }
            }
        });
        return total;
    };

    const handleRouteCalculated = (mode: TravelMode, result: google.maps.DirectionsResult) => {
        const leg = result.routes[0]?.legs[0];
        if (!leg) return;
        
        const distance = leg.distance?.value || 0;
        const duration = leg.duration?.value || 0;
        const carbonEmission = calculateCarbonEmission(mode, distance, leg.steps || []);

        setRouteData(prev => ({
            ...prev,
            [mode]: { distance, duration, carbonEmission }
        }));
    };

    const getSavingsText = (mode: TravelMode) => {
        const carData = routeData[TravelMode.DRIVING];
        const modeData = routeData[mode];
        if (!carData || !modeData) return "";
        if (mode === TravelMode.DRIVING) return "";
        
        if (carData.carbonEmission === 0) return "0% CO2";
        const diff = ((carData.carbonEmission - modeData.carbonEmission) / carData.carbonEmission) * 100;
        return `-${diff.toFixed(0)}% CO2`;
    };

    const getModeStyles = (mode: TravelMode) => {
        const isSelected = selectedMode === mode;
        const baseStyle = "flex flex-col items-center justify-start p-1.5 rounded-lg border transition-all cursor-pointer hover:shadow-sm flex-1 min-w-0";
        
        // Find best and worst
        const modesWithData = Object.entries(routeData)
            .filter(([_, data]) => data !== null)
            .map(([m, data]) => ({ mode: m as TravelMode, emission: data!.carbonEmission }))
            .sort((a, b) => a.emission - b.emission);
            
        let isBest = false;
        let isWorst = false;
        
        if (modesWithData.length > 0) {
            isBest = mode === modesWithData[0].mode || (mode === TravelMode.BICYCLING && mode === modesWithData[1]?.mode); // Bicycling/walking could tie for 0 emission
            isWorst = mode === TravelMode.DRIVING; // Driving is usually worst
        }

        if (isBest) {
            return `${baseStyle} ${isSelected ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`;
        }
        if (isWorst) {
            return `${baseStyle} ${isSelected ? 'bg-red-500 border-red-600 text-white shadow-red-200' : 'bg-red-100 border-red-200 text-red-700'}`;
        }
        
        return `${baseStyle} ${isSelected ? 'bg-slate-700 border-slate-800 text-white shadow-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`;
    };

    const formatEmission = (grams: number) => {
        if (grams === 0) return "0 g";
        return grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${grams.toFixed(0)} g`;
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header Search area */}
            <div className="bg-white p-4 border-b border-slate-200 shrink-0 shadow-xs">
                <form onSubmit={(e) => { handleSearch(e) }} className="flex flex-wrap items-end gap-3 max-w-4xl mx-auto">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Start Point</label>
                        <input name="origin" placeholder="Choose Start point..." className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Destination</label>
                        <input name="destination" placeholder="Choose Destination..." className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" />
                    </div>
                    <button type="submit" className="h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg text-sm transition-colors shadow-sm whitespace-nowrap">
                        Find Route
                    </button>
                </form>
            </div>

            {/* Map Area */}
            <div className="relative flex-1 bg-slate-200">
                {loading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                        <p className="text-slate-500 font-medium">Loading Map...</p>
                    </div>
                )}

                <APIProvider apiKey={apiKey} onLoad={() => { }}>
                    <Map defaultCenter={position} defaultZoom={12} mapId="DEMO_MAP_ID" disableDefaultUI={true}>
                        <TransitMapLayer visible={selectedMode === TravelMode.TRANSIT} />
                        {searchOrigin && searchDestination && Object.values(TravelMode).map((mode) => (
                            <Directions 
                                key={mode}
                                visible={selectedMode === mode}
                                directionsRequest={{
                                    origin: searchOrigin,
                                    destination: searchDestination,
                                    travelMode: mode as TravelMode
                                }}
                                onRouteCalculated={(result) => handleRouteCalculated(mode as TravelMode, result)}
                            />
                        ))}
                    </Map>
                </APIProvider>

                {/* Route Stats Card Overlay */}
                {searchOrigin && searchDestination && routeData[selectedMode] && (
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur shadow-lg border border-slate-200 rounded-xl p-4 w-[340px] max-h-[90vh] overflow-y-auto scbar-hide z-10 flex flex-col gap-5">
                        
                        {/* Transportation Mode Selector */}
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm mb-3 border-b border-slate-100 pb-2">Select Transportation</h3>
                            <div className="flex flex-row justify-between gap-1.5 mb-2">
                                {[
                                    { mode: TravelMode.BICYCLING, icon: <Bike size={20} /> },
                                    { mode: TravelMode.TRANSIT, icon: <Bus size={20} /> },
                                    { mode: TravelMode.WALKING, icon: <Footprints size={20} /> },
                                    { mode: TravelMode.DRIVING, icon: <Car size={20} /> },
                                ].map(({ mode, icon }) => (
                                    <button 
                                        key={mode} 
                                        type="button"
                                        onClick={() => setSelectedMode(mode)}
                                        className={getModeStyles(mode)}
                                    >
                                        <div className="flex flex-col items-center gap-1 mb-1">
                                            <div className="text-current opacity-90">{icon}</div>
                                        </div>
                                        {routeData[mode] ? (
                                            <>
                                                <div className={`font-semibold text-[11px] leading-none mb-1 whitespace-nowrap truncate w-full flex justify-center`}>
                                                    {Math.round(routeData[mode]!.duration / 60)} min
                                                </div>
                                                {mode !== TravelMode.DRIVING && (
                                                    <div className={`text-[9px] font-bold px-1 py-0.5 rounded-sm whitespace-nowrap w-full truncate ${selectedMode === mode ? 'bg-white/20 text-white' : 'bg-black/5 text-inherit'} opacity-90 leading-none flex justify-center`}>
                                                        {getSavingsText(mode)}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-[10px] opacity-70">--</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Trip Summary */}
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm mb-3 border-b border-slate-100 pb-2">Trip Summary</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Distance</span>
                                    <span className="font-bold text-slate-700">{(routeData[selectedMode]!.distance / 1000).toFixed(2)} km</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">Duration</span>
                                    <span className="font-bold text-slate-700">{Math.round(routeData[selectedMode]!.duration / 60)} min</span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-100">
                                    <span className="text-slate-500 font-medium">Estimated CO2</span>
                                    <div className="flex items-center gap-2">
                                        {selectedMode !== TravelMode.DRIVING && routeData[TravelMode.DRIVING] && (
                                            <span className="text-slate-400 line-through text-xs">
                                                {formatEmission(routeData[TravelMode.DRIVING]!.carbonEmission)} per car
                                            </span>
                                        )}
                                        <div className="flex flex-col items-end">
                                            <span className={`font-bold text-base ${selectedMode === TravelMode.DRIVING ? 'text-red-600' : 'text-emerald-600'}`}>   
                                                {formatEmission(routeData[selectedMode]!.carbonEmission)}
                                                {selectedMode === TravelMode.DRIVING && " per car"}
                                            </span>
                                            {selectedMode === TravelMode.DRIVING && (
                                                <span className="text-[10px] italic text-slate-400 mt-1 max-w-48 text-right leading-tight">
                                                    Consider carpooling
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
