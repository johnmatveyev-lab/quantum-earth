/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPinOff, Loader2 } from 'lucide-react';
import { useTrackingStore } from '@/store/useTrackingStore';

declare global {
    interface Window {
        google: any;
    }
}

export function StreetViewOverlay() {
    const { cameraFeedLocation, setCameraFeedLocation } = useTrackingStore();
    const mapRef = useRef<HTMLDivElement>(null);
    const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);

    const [loading, setLoading] = useState(false);
    const [errorDelay, setErrorDelay] = useState(false);

    useEffect(() => {
        if (!cameraFeedLocation) {
            if (panoramaRef.current) {
                panoramaRef.current.setVisible(false);
            }
            return;
        }

        const { lat, lon } = cameraFeedLocation;
        let isActive = true;

        const initStreetView = async () => {
            setLoading(true);
            setErrorDelay(false);

            try {
                // Wait for Google Maps API with retry
                let attempts = 0;
                while (!window.google?.maps?.StreetViewService && attempts < 20) {
                    await new Promise(r => setTimeout(r, 500));
                    attempts++;
                    if (!isActive) return;
                }
                if (!window.google?.maps?.StreetViewService) {
                    throw new Error("Google Maps API not loaded");
                }

                const sv = new google.maps.StreetViewService();

                // Search for panorama
                sv.getPanorama({ location: { lat, lng: lon }, radius: 5000, source: google.maps.StreetViewSource.OUTDOOR }, (data, status) => {
                    if (!isActive) return;

                    if (status === google.maps.StreetViewStatus.OK && data?.location?.pano) {
                        if (!mapRef.current) return;

                        // Create or update panorama
                        if (!panoramaRef.current) {
                            panoramaRef.current = new google.maps.StreetViewPanorama(mapRef.current, {
                                pano: data.location.pano,
                                pov: { heading: 0, pitch: 0 },
                                zoom: 1,
                                addressControl: false,
                                linksControl: true,
                                panControl: true,
                                enableCloseButton: false,
                                fullscreenControl: false,
                                showRoadLabels: false,
                                motionTracking: false,
                                motionTrackingControl: false
                            });
                        } else {
                            panoramaRef.current.setPano(data.location.pano);
                            panoramaRef.current.setVisible(true);
                        }
                        setLoading(false);
                    } else {
                        // Not found
                        setLoading(false);
                        setErrorDelay(true);
                        setTimeout(() => {
                            if (isActive) setCameraFeedLocation(null);
                        }, 3000); // Wait 3 seconds to show the error before closing
                    }
                });

            } catch (err) {
                console.error("Street View Error:", err);
                setLoading(false);
                setErrorDelay(true);
                setTimeout(() => {
                    if (isActive) setCameraFeedLocation(null);
                }, 3000);
            }
        };

        initStreetView();

        return () => {
            isActive = false;
        };
    }, [cameraFeedLocation, setCameraFeedLocation]);

    return (
        <AnimatePresence>
            {cameraFeedLocation && (
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
                                <div className={`w-2 h-2 rounded-full ${errorDelay ? 'bg-destructive' : 'bg-accent animate-pulse'}`} />
                                <div className={`font-mono text-xs tracking-widest ${errorDelay ? 'text-destructive' : 'text-accent'}`}>
                                    {errorDelay ? 'TELEMETRY FAILED' : 'GROUND TELEMETRY LINK ESTABLISHED'}
                                </div>
                                <div className="font-mono text-[10px] tracking-wider text-muted-foreground ml-4 hidden sm:block">
                                    LAT: {cameraFeedLocation.lat.toFixed(4)} // LON: {cameraFeedLocation.lon.toFixed(4)}
                                </div>
                            </div>

                            <button
                                onClick={() => setCameraFeedLocation(null)}
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
                                        ACQUIRING GROUND IMAGERY...
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
                                        NO GROUND TELEMETRY AVAILABLE
                                    </div>
                                    <div className="font-mono text-xs tracking-wider text-muted-foreground text-center">
                                        STREET VIEW IMAGERY NOT FOUND FOR THESE COORDINATES
                                    </div>
                                    <div className="w-48 h-1 bg-muted mt-8 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: "100%" }}
                                            animate={{ width: "0%" }}
                                            transition={{ duration: 3, ease: "linear" }}
                                            className="h-full bg-destructive"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Scanline overlay effect */}
                        <div className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-20" />

                        {/* Vignette effect to focus the center and make it look like a terminal feed */}
                        <div className="pointer-events-none absolute inset-0 z-30 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
