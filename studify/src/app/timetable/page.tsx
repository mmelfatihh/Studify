"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, MapPin, Trash2, X, ChevronRight, CalendarDays, Bell } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { invalidateDashCache } from "@/lib/dashCache";
import { requestNotificationPermission, registerPeriodicSync } from "@/lib/notifications";

// ─── Animation system ────────────────────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.06 } } };
const slideUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } };
const SHEET = { type: "spring" as const, stiffness: 280, damping: 28 };
// ─────────────────────────────────────────────────────────────────────────────

export interface ClassEntry {
  id: string;
  subject: string;
  startTime: string; // "09:00" 24h
  endTime: string;   // "10:30" 24h
  room: string;
  days: number[];    // 0=Mon … 6=Sun (repeating)
  colorIdx: number;
}

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_FULL  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const TIMETABLE_PALETTE = ["#8FB996", "#FFDAC1", "#feca57", "#ff6b6b", "#1dd1a1", "#C9ADA7"];

export function fmt12(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function getDuration(s: string, e: string): string {
  if (!s || !e) return "";
  const [sh, sm] = s.split(":").map(Number);
  const [eh, em] = e.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function getTodayIdx(): number {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1;   // → 0=Mon…6=Sun
}

function getStatus(entry: ClassEntry): "now" | "next" | "past" | "upcoming" {
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const start = toMins(entry.startTime);
  const end = toMins(entry.endTime || entry.startTime);
  if (nowMins >= start && nowMins < end) return "now";
  if (nowMins < start) return "upcoming";
  return "past";
}

function getNextId(entries: ClassEntry[]): string | null {
  const upcoming = entries
    .filter(e => getStatus(e) === "upcoming")
    .sort((a, b) => toMins(a.startTime) - toMins(b.startTime));
  return upcoming[0]?.id ?? null;
}

export default function TimetablePage() {
  const [uid, setUid]         = useState<string | null>(null);
  const [entries, setEntries] = useState<ClassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(getTodayIdx());

  // Add-class form
  const [showAdd, setShowAdd]         = useState(false);
  const [newSubject, setNewSubject]   = useState("");
  const [newStart, setNewStart]       = useState("");
  const [newEnd, setNewEnd]           = useState("");
  const [newRoom, setNewRoom]         = useState("");
  const [newDays, setNewDays]         = useState<number[]>([getTodayIdx()]);

  // Detail sheet
  const [selected, setSelected] = useState<ClassEntry | null>(null);

  // Notification permission banner
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  const saveTimer    = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad  = useRef(true);

  // Load
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid, "timetable", "data"));
      if (snap.exists() && snap.data().entries) setEntries(snap.data().entries);
      setLoading(false);
      isFirstLoad.current = false;
    });
    return () => unsub();
  }, []);

  // Show notification banner if permission not yet decided
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      setShowNotifBanner(true);
    }
  }, []);

  // Debounced save
  useEffect(() => {
    if (isFirstLoad.current || !uid) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setDoc(doc(db, "users", uid, "timetable", "data"), { entries }, { merge: true });
      invalidateDashCache(uid);
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [entries, uid]);

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    if (perm === "granted") await registerPeriodicSync();
    setShowNotifBanner(false);
  };

  const addEntry = () => {
    if (!newSubject.trim() || !newStart || !newDays.length) return;
    const colorIdx = entries.length % TIMETABLE_PALETTE.length;
    setEntries(p => [...p, {
      id: Date.now().toString(),
      subject: newSubject.trim(),
      startTime: newStart,
      endTime: newEnd || newStart,
      room: newRoom.trim(),
      days: [...newDays].sort((a, b) => a - b),
      colorIdx,
    }]);
    setNewSubject(""); setNewStart(""); setNewEnd(""); setNewRoom("");
    setNewDays([getTodayIdx()]);
    setShowAdd(false);
  };

  const deleteEntry = (id: string) => {
    setEntries(p => p.filter(e => e.id !== id));
    setSelected(null);
  };

  const isToday   = selectedDay === getTodayIdx();
  const dayClasses = entries
    .filter(e => e.days.includes(selectedDay))
    .sort((a, b) => toMins(a.startTime) - toMins(b.startTime));
  const nextId = isToday ? getNextId(dayClasses) : null;

  if (loading) return <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#18181B]" />;

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#18181B] safe-top flex flex-col transition-colors duration-500">
      <div className="flex-1 flex flex-col w-full md:max-w-2xl md:mx-auto px-6 pb-10">

        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex justify-between items-center mb-1"
        >
          <Link href="/">
            <button className="bg-white dark:bg-[#27272A] p-3 rounded-full shadow-sm text-gray-600 dark:text-gray-200 active:scale-95 transition-transform">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <span className="text-[#2D3436] dark:text-white font-bold tracking-widest opacity-80 text-sm">TIMETABLE</span>
          <button
            onClick={() => { setNewDays([selectedDay]); setShowAdd(true); }}
            className="bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] p-3 rounded-full shadow-sm active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </motion.div>

        {/* ── DATE SUBTITLE ── */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.08 }}
          className="text-center text-[#9A8C98] dark:text-gray-500 text-sm mb-4"
        >
          {isToday ? dateLabel : DAYS_FULL[selectedDay]}
        </motion.p>

        {/* ── NOTIFICATION BANNER ── */}
        <AnimatePresence>
          {showNotifBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="mb-4 overflow-hidden"
            >
              <div className="bg-[#2D3436] dark:bg-[#27272A] rounded-[18px] p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Bell size={16} className="text-white" />
                </div>
                <p className="flex-1 text-white text-sm font-medium leading-tight">
                  Get exam countdowns &amp; streak reminders
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleEnableNotifications}
                    className="bg-[#8FB996] text-white text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                  >
                    Enable
                  </button>
                  <button onClick={() => setShowNotifBanner(false)} className="text-white/40 hover:text-white/70 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── DAY SELECTOR ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
          className="flex gap-2 mb-6 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {DAYS_SHORT.map((d, i) => {
            const active    = selectedDay === i;
            const isT       = i === getTodayIdx();
            const hasCls    = entries.some(e => e.days.includes(i));
            return (
              <motion.button
                key={d}
                whileTap={{ scale: 0.92 }}
                onClick={() => setSelectedDay(i)}
                className={`relative flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 rounded-[16px] font-bold text-sm transition-all duration-200 ${
                  active
                    ? "bg-[#8FB996] text-white shadow-md"
                    : isT
                    ? "bg-[#8FB996]/15 text-[#5F8D6B] dark:bg-emerald-900/20 dark:text-emerald-400"
                    : "bg-white dark:bg-[#27272A] text-gray-400 dark:text-gray-500 shadow-sm"
                }`}
              >
                {d}
                {/* Dot: has classes on this day */}
                <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  hasCls
                    ? active ? "bg-white/70" : "bg-[#8FB996] dark:bg-emerald-400"
                    : "opacity-0"
                }`} />
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── CLASS LIST ── */}
        {dayClasses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.15 }}
            className="flex-1 flex flex-col items-center justify-center gap-5 text-center py-16"
          >
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              className="h-20 w-20 rounded-[24px] bg-[#8FB996]/15 dark:bg-emerald-900/20 flex items-center justify-center"
            >
              <CalendarDays size={32} className="text-[#8FB996] dark:text-emerald-400" />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-[#2D3436] dark:text-white mb-1">
                {isToday ? "No classes today" : `No classes on ${DAYS_SHORT[selectedDay]}`}
              </h2>
              <p className="text-[#9A8C98] text-sm max-w-xs">
                {isToday ? "Enjoy the free day!" : "Tap + to add a class for this day."}
              </p>
            </div>
            <button
              onClick={() => { setNewDays([selectedDay]); setShowAdd(true); }}
              className="bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] font-bold px-8 py-4 rounded-[20px] shadow-md active:scale-[0.98] transition-transform"
            >
              Add Class
            </button>
          </motion.div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {dayClasses.map((entry) => {
                const status  = isToday ? getStatus(entry) : "upcoming";
                const isNext  = entry.id === nextId && status !== "now";
                const color   = TIMETABLE_PALETTE[entry.colorIdx % TIMETABLE_PALETTE.length];
                const dur     = getDuration(entry.startTime, entry.endTime);

                return (
                  <motion.button
                    key={entry.id}
                    variants={slideUp}
                    layout
                    exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => setSelected(entry)}
                    className={`w-full bg-white dark:bg-[#27272A] rounded-[22px] shadow-sm border border-gray-100/80 dark:border-[#3F3F46] overflow-hidden flex text-left transition-all duration-300 hover:shadow-md ${
                      status === "past" ? "opacity-40" : ""
                    }`}
                  >
                    {/* Coloured left accent bar */}
                    <div className="w-[5px] shrink-0" style={{ backgroundColor: color }} />

                    {/* Time column */}
                    <div className="flex flex-col justify-center items-center px-4 py-5 min-w-[78px] border-r border-gray-100/80 dark:border-[#3F3F46]">
                      <span className="text-xs font-black text-[#2D3436] dark:text-white leading-tight whitespace-nowrap">
                        {fmt12(entry.startTime)}
                      </span>
                      {dur && (
                        <span className="text-[10px] text-gray-400 font-medium mt-0.5">{dur}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-4 py-5 flex flex-col justify-center gap-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-black text-[#2D3436] dark:text-white text-[15px] leading-tight truncate">
                          {entry.subject}
                        </span>
                        {status === "now" && (
                          <motion.span
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                            className="shrink-0 text-[9px] font-black bg-[#ff6b6b] text-white px-2 py-0.5 rounded-full"
                          >
                            NOW
                          </motion.span>
                        )}
                        {isNext && (
                          <span className="shrink-0 text-[9px] font-black bg-[#feca57]/30 text-[#996600] dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full">
                            NEXT
                          </span>
                        )}
                      </div>
                      {entry.room ? (
                        <div className="flex items-center gap-1 text-gray-400">
                          <MapPin size={11} />
                          <span className="text-[11px] truncate">{entry.room}</span>
                        </div>
                      ) : null}
                      {entry.days.length > 1 && (
                        <p className="text-[10px] text-gray-300 dark:text-gray-600 leading-tight">
                          {entry.days.map(d => DAYS_SHORT[d]).join(" · ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center pr-4">
                      <ChevronRight size={15} className="text-gray-300 dark:text-gray-600 shrink-0" />
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── ADD SHEET ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ y: 44, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 44, opacity: 0 }}
              transition={SHEET}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] w-full max-w-md rounded-t-[30px] sm:rounded-[30px] shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto"
            >
              {/* Drag handle */}
              <div className="flex justify-center -mt-1 mb-0 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>

              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-[#2D3436] dark:text-white">Add Class</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3F3F46] transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Subject */}
              <input
                value={newSubject} onChange={e => setNewSubject(e.target.value)}
                placeholder="Subject (e.g. Mathematics)"
                className="w-full p-4 bg-gray-100 dark:bg-[#18181B] rounded-xl text-[#2D3436] dark:text-white outline-none border border-transparent focus:border-[#8FB996] transition-colors font-medium"
              />

              {/* Days */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 block">Repeats on</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_SHORT.map((d, i) => (
                    <motion.button
                      key={d} whileTap={{ scale: 0.9 }}
                      onClick={() => setNewDays(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])}
                      className={`px-3.5 py-2 rounded-[12px] text-sm font-bold transition-colors ${
                        newDays.includes(i)
                          ? "bg-[#8FB996] text-white shadow-sm"
                          : "bg-gray-100 dark:bg-[#3F3F46] text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {d}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Start</label>
                  <input
                    type="time" value={newStart} onChange={e => setNewStart(e.target.value)}
                    className="w-full p-3.5 bg-gray-100 dark:bg-[#18181B] rounded-xl text-[#2D3436] dark:text-white outline-none border border-transparent focus:border-[#8FB996] transition-colors font-semibold text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">End</label>
                  <input
                    type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                    className="w-full p-3.5 bg-gray-100 dark:bg-[#18181B] rounded-xl text-[#2D3436] dark:text-white outline-none border border-transparent focus:border-[#8FB996] transition-colors font-semibold text-sm"
                  />
                </div>
              </div>

              {/* Room */}
              <input
                value={newRoom} onChange={e => setNewRoom(e.target.value)}
                placeholder="Room / Location (optional)"
                className="w-full p-4 bg-gray-100 dark:bg-[#18181B] rounded-xl text-[#2D3436] dark:text-white outline-none border border-transparent focus:border-[#8FB996] transition-colors font-medium"
              />

              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 text-gray-400 font-bold">
                  Cancel
                </button>
                <motion.button
                  onClick={addEntry}
                  disabled={!newSubject.trim() || !newStart || !newDays.length}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3.5 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] rounded-xl font-bold disabled:opacity-40 transition-opacity"
                >
                  Add Class
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DETAIL SHEET ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 44, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 44, opacity: 0 }}
              transition={SHEET}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] w-full max-w-md p-6 rounded-t-[30px] sm:rounded-[30px] shadow-2xl"
            >
              <div className="flex justify-center -mt-1 mb-4 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* Colour swatch + subject */}
              <div className="flex items-start gap-3.5 mb-6">
                <div
                  className="w-5 h-5 rounded-full mt-1 shrink-0 shadow-sm"
                  style={{ backgroundColor: TIMETABLE_PALETTE[selected.colorIdx % TIMETABLE_PALETTE.length] }}
                />
                <div className="min-w-0">
                  <h3 className="text-2xl font-black text-[#2D3436] dark:text-white leading-tight">{selected.subject}</h3>
                  <p className="text-gray-400 text-sm mt-0.5">
                    {fmt12(selected.startTime)}
                    {selected.endTime && selected.endTime !== selected.startTime
                      ? ` – ${fmt12(selected.endTime)}`
                      : ""}
                    {getDuration(selected.startTime, selected.endTime)
                      ? ` · ${getDuration(selected.startTime, selected.endTime)}`
                      : ""}
                  </p>
                  {selected.room ? (
                    <div className="flex items-center gap-1 text-gray-400 mt-1">
                      <MapPin size={12} />
                      <span className="text-sm">{selected.room}</span>
                    </div>
                  ) : null}
                  <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-2 leading-relaxed">
                    Every {selected.days.map(d => DAYS_FULL[d]).join(", ")}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => deleteEntry(selected.id)}
                  className="p-3.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors active:scale-95"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 py-3.5 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] rounded-xl font-bold active:scale-[0.98] transition-transform"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
