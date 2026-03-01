// SiteSign Service Worker — Geofence Push Notifications

const CACHE_NAME = "sitesign-v1";

// Install
self.addEventListener("install", (e) => {
    self.skipWaiting();
});

// Activate
self.addEventListener("activate", (e) => {
    e.waitUntil(self.clients.claim());
});

// Push notification received
self.addEventListener("push", (e) => {
    let data = { title: "SiteSign", body: "Don't forget to sign out!", visitId: null, siteUrl: "/" };
    try {
        data = { ...data, ...e.data.json() };
    } catch (_) { }

    const options = {
        body: data.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [200, 100, 200],
        tag: "geofence-" + (data.visitId || "unknown"),
        renotify: true,
        requireInteraction: true, // Keep notification visible until user interacts
        data: data,
        actions: [
            { action: "signout", title: "Sign Out" },
            { action: "still-here", title: "Still on Site" },
        ],
    };

    e.waitUntil(self.registration.showNotification(data.title, options));

    // Auto sign-out after 10 minutes if no interaction
    if (data.visitId) {
        setTimeout(() => {
            autoSignOut(data.visitId, data.siteUrl);
        }, 10 * 60 * 1000); // 10 minutes
    }
});

// Notification click
self.addEventListener("notificationclick", (e) => {
    e.notification.close();
    const data = e.notification.data || {};
    const visitId = data.visitId;
    const siteUrl = data.siteUrl || "/";

    if (e.action === "signout") {
        // Sign out via API
        e.waitUntil(
            fetch("/api/geofence-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visitId, action: "signout" }),
            }).then(() => {
                return self.clients.matchAll({ type: "window" }).then((clients) => {
                    for (const client of clients) {
                        client.postMessage({ type: "SIGNED_OUT", visitId });
                    }
                });
            })
        );
    } else if (e.action === "still-here") {
        // Snooze for 30 minutes
        e.waitUntil(
            fetch("/api/geofence-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visitId, action: "snooze" }),
            }).then(() => {
                return self.clients.matchAll({ type: "window" }).then((clients) => {
                    for (const client of clients) {
                        client.postMessage({ type: "SNOOZED", visitId });
                    }
                });
            })
        );
    } else {
        // Clicked notification body — open the site page
        e.waitUntil(
            self.clients.matchAll({ type: "window" }).then((clients) => {
                for (const client of clients) {
                    if (client.url.includes(siteUrl)) {
                        return client.focus();
                    }
                }
                return self.clients.openWindow(siteUrl);
            })
        );
    }
});

// Auto sign-out helper
async function autoSignOut(visitId, siteUrl) {
    try {
        await fetch("/api/geofence-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitId, action: "auto-signout" }),
        });
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
            client.postMessage({ type: "AUTO_SIGNED_OUT", visitId });
        }
    } catch (err) {
        console.error("Auto sign-out failed:", err);
    }
}
