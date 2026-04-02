// Push-notification helpers
// Strategy: Periodic Background Sync (Chrome/Android installed PWA) + on-open check (all platforms)
// No server required — data bridge via Cache API so the service worker can read exam/streak state.

const NOTIF_CACHE = "studify-notifications";

// ── Service worker registration ───────────────────────────────────────────────
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch {
    return null;
  }
}

// ── Notification permission ───────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

// ── Periodic Background Sync (best-effort — Chrome Android installed PWA) ────
export async function registerPeriodicSync() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!("periodicSync" in reg)) return;
    const status = await navigator.permissions.query({
      name: "periodic-background-sync" as PermissionName,
    });
    if (status.state === "granted") {
      await (reg as any).periodicSync.register("exam-reminders", {
        minInterval: 12 * 60 * 60 * 1000, // 12 hours
      });
    }
  } catch {}
}

// ── Update the data the SW reads ──────────────────────────────────────────────
export async function updateNotificationData(
  exams: { id: string; subject: string; date: string; prepLevel: number }[],
  streak: { current: number; lastStudied?: string } | null
) {
  if (typeof window === "undefined" || !("caches" in window)) return;
  try {
    const cache = await caches.open(NOTIF_CACHE);
    // Preserve lastNotified so we don't re-fire on the same day
    const existing = await cache.match("/notification-data");
    const prev = existing ? await existing.json() : {};
    await cache.put(
      "/notification-data",
      new Response(
        JSON.stringify({ ...prev, exams, streak }),
        { headers: { "Content-Type": "application/json" } }
      )
    );
  } catch {}
}

// ── On-open check (fires for ALL platforms on next app open) ──────────────────
// Rate-limited to once per calendar day so it never gets annoying.
export function checkOnOpen(
  exams: { id: string; subject: string; date: string; prepLevel: number }[],
  streak: { current: number; lastStudied?: string } | null
) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now     = new Date();
  const today   = now.toDateString();
  const lastKey = "studify_last_notif_check";

  if (localStorage.getItem(lastKey) === today) return;
  localStorage.setItem(lastKey, today);

  // Exam countdowns
  for (const exam of exams) {
    const daysLeft = Math.ceil((new Date(exam.date).getTime() - now.getTime()) / 86400000);
    if (daysLeft > 0 && daysLeft <= 3) {
      new Notification(`${exam.subject} exam in ${daysLeft} day${daysLeft > 1 ? "s" : ""}!`, {
        body: `You're ${exam.prepLevel}% ready. Keep going! 📚`,
        icon: "/icon.png",
        tag: `exam-${exam.id}`,
      });
    }
  }

  // Streak at risk
  if (streak && streak.current > 0 && streak.lastStudied) {
    const yesterday = new Date(now.getTime() - 86400000).toDateString();
    if (streak.lastStudied === yesterday) {
      new Notification("🔥 Streak at risk!", {
        body: `You have a ${streak.current}-day streak — study today to keep it alive.`,
        icon: "/icon.png",
        tag: "streak-reminder",
      });
    }
  }
}
