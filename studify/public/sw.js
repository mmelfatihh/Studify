// Studify Service Worker
// Handles: Periodic Background Sync + push events (FCM-ready)
//
// Two check cadences:
//   Daily  — exam countdowns (≤3 days), streak at risk          → lastNotified
//   Weekly — exam reminder (no upcoming), attendance reports    → lastWeeklyCheck

const NOTIF_CACHE = "studify-notifications";
const WEEKLY_MS   = 7 * 24 * 60 * 60 * 1000;

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

    const now            = new Date();
    const today          = now.toDateString();
    let   cacheNeedsUpdate = false;

    // ── Daily: exam countdowns + streak ──────────────────────────────────────
    if (data.lastNotified !== today) {
      data.lastNotified = today;
      cacheNeedsUpdate  = true;

      for (const exam of (data.exams || [])) {
        const daysLeft = Math.ceil((new Date(exam.date) - now) / 86400000);
        if (daysLeft > 0 && daysLeft <= 3) {
          await self.registration.showNotification(
            `${exam.subject} exam in ${daysLeft} day${daysLeft > 1 ? "s" : ""}!`,
            {
              body:  `You're ${exam.prepLevel}% ready. Time to study! 📚`,
              icon:  "/icon.png",
              badge: "/icon.png",
              tag:   `exam-${exam.id}`,
              data:  { url: "/exam" },
            }
          );
        }
      }

      const streak = data.streak;
      if (streak && streak.current > 0 && streak.lastStudied) {
        const yesterday = new Date(now - 86400000).toDateString();
        if (streak.lastStudied === yesterday) {
          await self.registration.showNotification("🔥 Streak at risk!", {
            body:  `You have a ${streak.current}-day streak — open Studify to keep it alive.`,
            icon:  "/icon.png",
            badge: "/icon.png",
            tag:   "streak-reminder",
            data:  { url: "/" },
          });
        }
      }
    }

    // ── Weekly: exam reminder + attendance reports ────────────────────────────
    const lastWeekly = data.lastWeeklyCheck || 0;
    if (Date.now() - lastWeekly >= WEEKLY_MS) {
      data.lastWeeklyCheck = Date.now();
      cacheNeedsUpdate     = true;

      // Exam reminder — only if no upcoming exams
      const hasUpcoming = (data.exams || []).some(
        (e) => Math.ceil((new Date(e.date) - now) / 86400000) > 0
      );
      if (!hasUpcoming) {
        await self.registration.showNotification("Upcoming exam? Add it here! 📅", {
          body:  "No upcoming exams tracked in Exam Pulse. Add one to stay on top of your prep.",
          icon:  "/icon.png",
          badge: "/icon.png",
          tag:   "no-exam-reminder",
          data:  { url: "/exam" },
        });
      }

      // Attendance — perfect attendance report per subject
      for (const subj of (data.attendance || [])) {
        if (!subj.total || subj.attended !== subj.total) continue;
        const skipsLeft = Math.max(
          0,
          Math.floor(subj.attended / (subj.required / 100) - subj.total)
        );
        if (skipsLeft === 0) {
          await self.registration.showNotification(
            `Perfect attendance for ${subj.name}! ⚠️`,
            {
              body:  `Zero skips available though — one absence puts you below the required threshold!`,
              icon:  "/icon.png",
              badge: "/icon.png",
              tag:   `attendance-${subj.name}`,
              data:  { url: "/attendance" },
            }
          );
        } else {
          await self.registration.showNotification(
            `Perfect attendance for ${subj.name}! 🎉`,
            {
              body:  `${skipsLeft} skip${skipsLeft !== 1 ? "s" : ""} available. Keep it up!`,
              icon:  "/icon.png",
              badge: "/icon.png",
              tag:   `attendance-${subj.name}`,
              data:  { url: "/attendance" },
            }
          );
        }
      }
    }

    if (cacheNeedsUpdate) {
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
        body:  d.body || "",
        icon:  "/icon.png",
        badge: "/icon.png",
        data:  { url: d.url || "/" },
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
