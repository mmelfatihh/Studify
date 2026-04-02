// Studify Service Worker
// Handles: Periodic Background Sync (exam/streak reminders) + push events (future FCM)

const NOTIF_CACHE = "studify-notifications";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

// ── Periodic Background Sync ──────────────────────────────────────────────────
self.addEventListener("periodicsync", (e) => {
  if (e.tag === "exam-reminders") {
    e.waitUntil(checkAndNotify());
  }
});

async function checkAndNotify() {
  try {
    const cache = await caches.open(NOTIF_CACHE);
    const resp  = await cache.match("/notification-data");
    if (!resp) return;
    const data = await resp.json();

    const now     = new Date();
    const today   = now.toDateString();
    if (data.lastNotified === today) return; // already fired today

    const fired = [];

    // Exam countdowns
    for (const exam of (data.exams || [])) {
      const daysLeft = Math.ceil((new Date(exam.date) - now) / 86400000);
      if (daysLeft > 0 && daysLeft <= 3) {
        await self.registration.showNotification(
          `${exam.subject} exam in ${daysLeft} day${daysLeft > 1 ? "s" : ""}!`,
          {
            body: `You're ${exam.prepLevel}% ready. Time to study! 📚`,
            icon: "/icon.png",
            badge: "/icon.png",
            tag: `exam-${exam.id}`,
            data: { url: "/exam" },
          }
        );
        fired.push(exam.id);
      }
    }

    // Streak at risk
    const streak = data.streak;
    if (streak && streak.current > 0 && streak.lastStudied) {
      const yesterday = new Date(now - 86400000).toDateString();
      if (streak.lastStudied === yesterday) {
        await self.registration.showNotification("🔥 Streak at risk!", {
          body: `You have a ${streak.current}-day streak — open Studify to keep it alive.`,
          icon: "/icon.png",
          badge: "/icon.png",
          tag: "streak-reminder",
          data: { url: "/" },
        });
        fired.push("streak");
      }
    }

    if (fired.length > 0) {
      data.lastNotified = today;
      await cache.put(
        "/notification-data",
        new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } })
      );
    }
  } catch {}
}

// ── Push (future FCM / server-sent push) ─────────────────────────────────────
self.addEventListener("push", (e) => {
  if (!e.data) return;
  try {
    const d = e.data.json();
    e.waitUntil(
      self.registration.showNotification(d.title || "Studify", {
        body: d.body || "",
        icon: "/icon.png",
        badge: "/icon.png",
        data: { url: d.url || "/" },
      })
    );
  } catch {}
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((all) => {
      for (const c of all) {
        if ("focus" in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
