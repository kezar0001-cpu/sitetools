"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Types for Leaflet (imported dynamically)
type LeafletMap = import("leaflet").Map;
type LeafletMarker = import("leaflet").Marker;

interface MapPickerProps {
    latitude: number | null;
    longitude: number | null;
    onLocationChange: (lat: number, lng: number, address?: string) => void;
}

interface NominatimResult {
    lat: string;
    lon: string;
    display_name: string;
}

export default function MapPicker({ latitude, longitude, onLocationChange }: MapPickerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const markerRef = useRef<LeafletMarker | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [detecting, setDetecting] = useState(false);
    const [leafletLoaded, setLeafletLoaded] = useState(false);
    const LRef = useRef<typeof import("leaflet") | null>(null);

    // Dynamically import Leaflet (avoids SSR issues with Next.js)
    useEffect(() => {
        import("leaflet").then((L) => {
            LRef.current = L;
            setLeafletLoaded(true);
        });
    }, []);

    // Initialize the map
    useEffect(() => {
        if (!leafletLoaded || !mapContainerRef.current || mapRef.current) return;
        const L = LRef.current!;

        // Import Leaflet CSS
        if (!document.querySelector('link[href*="leaflet.css"]')) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            document.head.appendChild(link);
        }

        // Fix default marker icons (Leaflet + bundlers issue)
        const DefaultIcon = L.icon({
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });

        const initialLat = latitude ?? -33.8688;
        const initialLng = longitude ?? 151.2093;
        const initialZoom = latitude && longitude ? 16 : 4;

        const map = L.map(mapContainerRef.current, {
            center: [initialLat, initialLng],
            zoom: initialZoom,
            zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);

        // Add draggable marker if we have initial coords
        if (latitude && longitude) {
            const marker = L.marker([latitude, longitude], { draggable: true, icon: DefaultIcon }).addTo(map);
            marker.on("dragend", () => {
                const pos = marker.getLatLng();
                onLocationChange(pos.lat, pos.lng);
            });
            markerRef.current = marker;
        }

        // Click on map to place/move marker
        map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;
            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
            } else {
                const marker = L.marker([lat, lng], { draggable: true, icon: DefaultIcon }).addTo(map);
                marker.on("dragend", () => {
                    const pos = marker.getLatLng();
                    onLocationChange(pos.lat, pos.lng);
                });
                markerRef.current = marker;
            }
            onLocationChange(lat, lng);
        });

        mapRef.current = map;

        // Cleanup
        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leafletLoaded]);

    // Update marker when lat/lng props change externally
    useEffect(() => {
        if (!mapRef.current || !LRef.current || !latitude || !longitude) return;
        const L = LRef.current;

        if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
        } else {
            const DefaultIcon = L.icon({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
            });
            const marker = L.marker([latitude, longitude], { draggable: true, icon: DefaultIcon }).addTo(mapRef.current);
            marker.on("dragend", () => {
                const pos = marker.getLatLng();
                onLocationChange(pos.lat, pos.lng);
            });
            markerRef.current = marker;
        }
        mapRef.current.setView([latitude, longitude], 16);
    }, [latitude, longitude, onLocationChange]);

    // Search for address using Nominatim (OpenStreetMap geocoding)
    const searchAddress = useCallback(async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setSearchError(null);
        setSearchResults([]);

        try {
            const encoded = encodeURIComponent(searchQuery.trim());
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=5`,
                { headers: { "Accept-Language": "en" } }
            );
            if (!res.ok) throw new Error("Search failed");
            const data: NominatimResult[] = await res.json();
            if (data.length === 0) {
                setSearchError("No results found. Try a more specific address.");
            } else {
                setSearchResults(data);
            }
        } catch {
            setSearchError("Search failed. Please try again.");
        } finally {
            setSearching(false);
        }
    }, [searchQuery]);

    // Select a search result
    function selectResult(result: NominatimResult) {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        onLocationChange(lat, lng, result.display_name);
        setSearchResults([]);
        setSearchQuery(result.display_name);

        if (mapRef.current) {
            mapRef.current.setView([lat, lng], 16);
        }
    }

    // Auto-detect location
    function detectLocation() {
        if (!navigator.geolocation) {
            setSearchError("Geolocation not supported.");
            return;
        }
        setDetecting(true);
        setSearchError(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                onLocationChange(pos.coords.latitude, pos.coords.longitude);
                setDetecting(false);
                setSearchQuery("");
            },
            (err) => {
                setSearchError(err.code === 1 ? "Location permission denied." : "Could not detect location.");
                setDetecting(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    return (
        <div className="space-y-3">
            {/* Search bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Search address, e.g. 123 Main St, Sydney"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchAddress(); } }}
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <button
                    onClick={searchAddress}
                    disabled={searching || !searchQuery.trim()}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shrink-0"
                >
                    {searching ? "..." : "Search"}
                </button>
                <button
                    onClick={detectLocation}
                    disabled={detecting}
                    title="Use my current location"
                    className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 p-2.5 rounded-xl transition-colors shrink-0"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${detecting ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {searchResults.map((r, i) => (
                        <button
                            key={i}
                            onClick={() => selectResult(r)}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-start gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-gray-700 line-clamp-2">{r.display_name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Error message */}
            {searchError && (
                <p className="text-sm text-red-600 font-semibold">{searchError}</p>
            )}

            {/* Map container */}
            <div
                ref={mapContainerRef}
                className="w-full h-64 sm:h-80 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-100"
                style={{ minHeight: "250px" }}
            />

            {/* Helper text */}
            <p className="text-xs text-gray-400">
                Search for an address or click anywhere on the map to place the pin. Drag the pin to adjust.
            </p>

            {/* Current coordinates display */}
            {latitude && longitude && (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>
                        Pin set at <strong>{latitude.toFixed(6)}, {longitude.toFixed(6)}</strong>
                    </span>
                </div>
            )}
        </div>
    );
}
