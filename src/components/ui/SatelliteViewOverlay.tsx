/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPinOff, Loader2, Map as MapIcon } from 'lucide-react';
import { useTrackingStore } from '@/store/useTrackingStore';

export function SatelliteViewOverlay() {
    const { satelliteViewLocation, setSatelliteViewLocation } = useTrackingStore();
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<google.maps.Map | null>(null);

    const [loading, setLoading] = useState(false);
    const [errorDelay, setErrorDelay] = useState(false);

    useEffect(() => {
        if (!satelliteViewLocation) {
            // Clean up the map ref when the overlay closes so a fresh map is created next time
            googleMapRef.current = null;
            return;
        }

        const { lat, lon } = satelliteViewLocation;
        let isActive = true;

        const waitForGoogleMaps = (): Promise<void> => {
            return new Promise((resolve, reject) => {
                let attempts = 0;
                const maxAttempts = 20; // 20 × 500ms = 10s max wait
                const check = () => {
                    if (!isActive) return reject(new Error('cancelled'));
                    if (window.google?.maps?.Map) return resolve();
                    attempts++;
                    if (attempts >= maxAttempts) return reject(new Error('Google Maps API failed to load'));
                    setTimeout(check, 500);
                };
                check();
            });
        };

        const initSatelliteView = async () => {
            setLoading(true);
            setErrorDelay(false);

            try {
                await waitForGoogleMaps();
                if (!isActive || !mapRef.current) return;

                // Always create a fresh map instance to avoid stale references
                googleMapRef.current = new google.maps.Map(mapRef.current, {
                    center: { lat, lng: lon },
                    zoom: 18,
                    mapTypeId: 'satellite',
                    disableDefaultUI: true,
                    zoomControl: true,
                    mapTypeControl: false,
                    scaleControl: true,
                    streetViewControl: false,
                    rotateControl: true,
                    fullscreenControl: false,
                    tilt: 45,
                });

                setLoading(false);
            } catch (err) {
                console.error("Satellite View Error:", err);
                if (!isActive) return;
                setLoading(false);
                setErrorDelay(true);
                setTimeout(() => {
                    if (isActive) setSatelliteViewLocation(null);
                }, 3000);
            }
        };

        initSatelliteView();

        return () => {
            isActive = false;
        };
    }, [satelliteViewLocation, setSatelliteViewLocation]);

    return (
        <AnimatePresence>
            {satelliteViewLocation && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed inset-0 z-40 bg-background/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
                >
                    <div className="relative w-full h-full max-w-7xl max-h-[85vh] rounded-xl overflow-hidden glass-panel hud-border shadow-2xl flex flex-col">

                        {/* Header */}
                        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-background/90 to-transparent pointer-events-none">
                            <div className="flex items-center gap-3">
                                <MapIcon size={16} className="text-accent" />
                                <div className={`font-mono text-xs tracking-widest ${errorDelay ? 'text-destructive' : 'text-accent'}`}>
                                    {errorDelay ? 'SATELLITE LINK FAILED' : 'HIGH-RES SATELLITE TELEMETRY'}
                                </div>
                                <div className="font-mono text-[10px] tracking-wider text-muted-foreground ml-4 hidden sm:block">
                                    LAT: {satelliteViewLocation.lat.toFixed(4)} // LON: {satelliteViewLocation.lon.toFixed(4)}
                                </div>
                            </div>

                            <button
                                onClick={() => setSatelliteViewLocation(null)}
                                className="pointer-events-auto p-2 bg-background/50 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors rounded-lg border border-border hover:border-destructive/50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Map Container */}
                        <div ref={mapRef} className="absolute inset-0 z-10 bg-black/50" />

                        {/* Loading State */}
                        <AnimatePresence>
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-20"
                                >
                                    <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                                    <div className="font-mono text-sm tracking-widest text-accent animate-pulse">
                                        ACQUIRING ORBITAL IMAGERY...
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Error State */}
                        <AnimatePresence>
                            {errorDelay && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-20"
                                >
                                    <MapPinOff className="w-16 h-16 text-destructive mb-6" />
                                    <div className="font-mono text-lg tracking-widest text-destructive mb-2 text-center">
                                        ORBITAL TELEMETRY OFFLINE
                                    </div>
                                    <div className="font-mono text-xs tracking-wider text-muted-foreground text-center">
                                        SATELLITE IMAGERY NOT FOUND FOR THESE COORDINATES
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Scanline overlay effect */}
                        <div className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-20" />

                        {/* Vignette effect */}
                        <div className="pointer-events-none absolute inset-0 z-30 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
