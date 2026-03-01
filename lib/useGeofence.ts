"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface GeofenceConfig {
    visitId: string;
    siteLatitude: number;
    siteLongitude: number;
    radiusKm: number;
    siteUrl: string;
}

interface GeofenceState {
    isTracking: boolean;
    permissionGranted: boolean | null;
    distanceKm: number | null;
    isOutsideGeofence: boolean;
    isSnoozed: boolean;
    snoozeUntil: string | null;
    error: string | null;
}

// Haversine formula to calculate distance between two GPS points
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Convert VAPID base64 key to Uint8Array for Push API
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        output[i] = rawData.charCodeAt(i);
    }
    return output;
}

export function useGeofence(config: GeofenceConfig | null) {
    const [state, setState] = useState<GeofenceState>({
        isTracking: false,
        permissionGranted: null,
        distanceKm: null,
        isOutsideGeofence: false,
        isSnoozed: false,
        snoozeUntil: null,
        error: null,
    });

    const watchIdRef = useRef<number | null>(null);
    const notifiedRef = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Register service worker and set up push subscription
    const setupPushSubscription = useCallback(async (visitId: string) => {
        try {
            if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                console.warn("Push notifications not supported");
                return;
            }

            const registration = await navigator.serviceWorker.register("/sw.js");
            await navigator.serviceWorker.ready;

            // Get VAPID public key
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidKey) {
                console.warn("VAPID public key not configured");
                return;
            }

            // Check existing subscription
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
                });
            }

            // Store subscription in the visit record
            await supabase
                .from("site_visits")
                .update({ push_subscription: subscription.toJSON() })
                .eq("id", visitId);

        } catch (err) {
            console.warn("Push subscription setup failed:", err);
        }
    }, []);

    // Send push notification via API
    const sendPushNotification = useCallback(async (visitId: string, siteUrl: string) => {
        try {
            await fetch("/api/push-notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visitId, siteUrl }),
            });
        } catch (err) {
            console.warn("Failed to send push notification:", err);
        }
    }, []);

    // Handle "Still on Site" action
    const snooze = useCallback(async () => {
        if (!config) return;
        try {
            const res = await fetch("/api/geofence-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visitId: config.visitId, action: "snooze" }),
            });
            const data = await res.json();
            if (data.ok) {
                notifiedRef.current = false;
                setState((s) => ({
                    ...s,
                    isSnoozed: true,
                    snoozeUntil: data.snoozedUntil,
                    isOutsideGeofence: false,
                }));
            }
        } catch (err) {
            console.warn("Snooze failed:", err);
        }
    }, [config]);

    // Handle "Sign Out" action from in-page alert
    const signOutFromGeofence = useCallback(async () => {
        if (!config) return;
        try {
            await fetch("/api/geofence-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visitId: config.visitId, action: "signout" }),
            });
        } catch (err) {
            console.warn("Sign out failed:", err);
        }
    }, [config]);

    // Start tracking
    useEffect(() => {
        if (!config) return;
        if (!config.siteLatitude || !config.siteLongitude) return;

        // Request location permission
        if (!navigator.geolocation) {
            setState((s) => ({ ...s, error: "Geolocation not supported" }));
            return;
        }

        // Set up push subscription
        setupPushSubscription(config.visitId);

        // Listen for messages from service worker
        const handleSWMessage = (event: MessageEvent) => {
            if (event.data?.type === "SIGNED_OUT" || event.data?.type === "AUTO_SIGNED_OUT") {
                if (event.data.visitId === config.visitId) {
                    // Reload the page to reflect sign-out
                    window.location.reload();
                }
            }
            if (event.data?.type === "SNOOZED" && event.data.visitId === config.visitId) {
                notifiedRef.current = false;
                setState((s) => ({ ...s, isSnoozed: true, isOutsideGeofence: false }));
            }
        };
        navigator.serviceWorker?.addEventListener("message", handleSWMessage);

        const checkPosition = (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords;
            const dist = haversineKm(config.siteLatitude, config.siteLongitude, latitude, longitude);

            setState((s) => {
                // Check if snoozed
                if (s.snoozeUntil && new Date(s.snoozeUntil) > new Date()) {
                    return { ...s, distanceKm: dist, isOutsideGeofence: false, isTracking: true, permissionGranted: true };
                }

                const outside = dist > config.radiusKm;

                // If just went outside and not yet notified, trigger notification
                if (outside && !notifiedRef.current) {
                    notifiedRef.current = true;
                    // Send push notification via API
                    sendPushNotification(config.visitId, config.siteUrl);
                    // Also show in-page notification if Notification API is available
                    if ("Notification" in window && Notification.permission === "granted") {
                        new Notification("SiteSign — Sign Out Reminder", {
                            body: `You appear to be ${dist.toFixed(1)}km from the site. Don't forget to sign out!`,
                            tag: "geofence-" + config.visitId,
                        });
                    }
                }

                // Reset notified flag when back in geofence
                if (!outside) {
                    notifiedRef.current = false;
                }

                return {
                    ...s,
                    distanceKm: dist,
                    isOutsideGeofence: outside,
                    isTracking: true,
                    permissionGranted: true,
                    isSnoozed: false,
                };
            });
        };

        const handleError = (err: GeolocationPositionError) => {
            setState((s) => ({
                ...s,
                permissionGranted: false,
                error: err.code === 1 ? "Location permission denied" : "Location unavailable",
            }));
        };

        // Start watching position
        watchIdRef.current = navigator.geolocation.watchPosition(checkPosition, handleError, {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 15000,
        });

        // Also poll every 60 seconds as a fallback
        intervalRef.current = setInterval(() => {
            navigator.geolocation.getCurrentPosition(checkPosition, handleError, {
                enableHighAccuracy: false,
                maximumAge: 60000,
                timeout: 10000,
            });
        }, 60000);

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
        };
    }, [config, setupPushSubscription, sendPushNotification]);

    return { ...state, snooze, signOutFromGeofence };
}
