// Push-notification helpers
// Strategy: Periodic Background Sync (Chrome/Android installed PWA) + on-open check (all platforms)
// No server required — data bridge via Cache API so the service worker can read app state.
//
// Two check cadences:
//   Daily  — exam countdowns (≤3 days), streak at risk
//   Weekly — exam reminder (no upcoming exams), attendance perfect-attendance report

const NOTIF_CACHE = "studify-notifications";
const WEEKLY_MS   = 7 * 24 * 60 * 60 * 1000;

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
        minInterval: 12 * 60 * 60 * 1000,
      });
    }
  } catch {}
}

// ── Update the data the SW reads ──────────────────────────────────────────────
export async function updateNotificationData(
  exams:      { id: string; subject: string; date: string; prepLevel: number }[],
  streak:     { current: number; lastStudied?: string } | null,
  attendance: { name: string; attended: number; total: number; required: number }[]
) {
  if (typeof window === "undefined" || !("caches" in window)) return;
  try {
    const cache    = await caches.open(NOTIF_CACHE);
    const existing = await cache.match("/notification-data");
    // Preserve rate-limit timestamps so they survive data refreshes
    const prev     = existing ? await existing.json() : {};
    await cache.put(
      "/notification-data",
      new Response(
        JSON.stringify({ ...prev, exams, streak, attendance }),
        { headers: { "Content-Type": "application/json" } }
      )
    );
  } catch {}
}

// ── On-open check (fires for ALL platforms on next app open) ──────────────────
export function checkOnOpen(
  exams:      { id: string; subject: string; date: string; prepLevel: number }[],
  streak:     { current: number; lastStudied?: string } | null,
  attendance: { name: string; attended: number; total: number; required: number }[]
) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();

  // ── Daily checks ─────────────────────────────────────────────────────────────
  const today   = now.toDateString();
  const dailyKey = "studify_last_notif_check";
  if (localStorage.getItem(dailyKey) !== today) {
    localStorage.setItem(dailyKey, today);

    // Exam countdowns (within 3 days)
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

  // ── Weekly checks ─────────────────────────────────────────────────────────────
  const weeklyKey = "studify_last_weekly_notif";
  const lastWeekly = parseInt(localStorage.getItem(weeklyKey) || "0");
  if (Date.now() - lastWeekly < WEEKLY_MS) return;
  localStorage.setItem(weeklyKey, String(Date.now()));

  // Exam reminder — only fires if no upcoming exams
  const hasUpcoming = exams.some(e =>
    Math.ceil((new Date(e.date).getTime() - now.getTime()) / 86400000) > 0
  );
  if (!hasUpcoming) {
    new Notification("Upcoming exam? Add it here! 📅", {
      body: "No upcoming exams tracked in Exam Pulse. Add one to stay on top of your prep.",
      icon: "/icon.png",
      tag: "no-exam-reminder",
    });
  }

  // Attendance — perfect attendance report per subject
  for (const subj of attendance) {
    if (!subj.total || subj.attended !== subj.total) continue;
    const skipsLeft = Math.max(
      0,
      Math.floor(subj.attended / (subj.required / 100) - subj.total)
    );
    if (skipsLeft === 0) {
      new Notification(`Perfect attendance for ${subj.name}! ⚠️`, {
        body: `Zero skips available though — one absence puts you below the required threshold!`,
        icon: "/icon.png",
        tag: `attendance-${subj.name}`,
      });
    } else {
      new Notification(`Perfect attendance for ${subj.name}! 🎉`, {
        body: `${skipsLeft} skip${skipsLeft !== 1 ? "s" : ""} available. Keep it up!`,
        icon: "/icon.png",
        tag: `attendance-${subj.name}`,
      });
    }
  }
}
