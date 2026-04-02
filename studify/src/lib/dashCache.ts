// Shared dashboard cache utilities
// TTL is a safety net — primary invalidation is write-based (each sub-page
// calls invalidateDashCache after saving so the dashboard always re-fetches
// fresh data on the next visit after any change).

const KEY = "studify_dash_v1";
const TTL = 5 * 60 * 1000; // 5 minutes (fallback only)

export function readDashCache(uid: string) {
  try {
    const raw = localStorage.getItem(`${KEY}_${uid}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > TTL) return null;
    return data;
  } catch { return null; }
}

export function writeDashCache(uid: string, data: object) {
  try {
    localStorage.setItem(`${KEY}_${uid}`, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

export function invalidateDashCache(uid: string) {
  try {
    localStorage.removeItem(`${KEY}_${uid}`);
  } catch {}
}

export function patchDashCache(uid: string, patch: object) {
  try {
    const raw = localStorage.getItem(`${KEY}_${uid}`);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.data = { ...parsed.data, ...patch };
    localStorage.setItem(`${KEY}_${uid}`, JSON.stringify(parsed));
  } catch {}
}
