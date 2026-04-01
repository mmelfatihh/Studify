"use client";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, AlertTriangle, CheckCircle, Loader2, Plus, X, Trash2, BookOpen } from "lucide-react";
import Link from "next/link";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase";

interface Subject {
  id: string;
  name: string;
  total: number;
  attended: number;
  required: number;
}

function MiniRing({ pct, safe }: { pct: number; safe: boolean }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="56" height="56" className="-rotate-90" style={{ overflow: "visible" }}>
      <circle cx="28" cy="28" r={r} className="stroke-white/25 dark:stroke-gray-700" strokeWidth="5" fill="transparent" />
      <motion.circle
        cx="28" cy="28" r={r}
        className="stroke-white dark:stroke-current"
        strokeWidth="5" fill="transparent"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AttendanceCalculator() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  // Load from Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const snap = await getDoc(doc(db, "users", currentUser.uid, "attendance", "subjects"));
        if (snap.exists() && snap.data().list) {
          setSubjects(snap.data().list);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Auto-save with debounce whenever subjects change
  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    if (!user) return;
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await setDoc(doc(db, "users", user.uid, "attendance", "subjects"), { list: subjects });
      // Also update the legacy stats doc with aggregated data so the dashboard widget still works
      if (subjects.length > 0) {
        const minSkips = Math.min(...subjects.map(s => Math.max(0, Math.floor((s.attended / (s.required / 100)) - s.total))));
        const allSafe = subjects.every(s => s.total > 0 && Math.round((s.attended / s.total) * 100) >= s.required);
        await setDoc(doc(db, "users", user.uid, "attendance", "stats"), {
          total: subjects.reduce((a, s) => a + s.total, 0),
          attended: subjects.reduce((a, s) => a + s.attended, 0),
          required: subjects[0]?.required ?? 75,
        }, { merge: true });
      }
      setSaving(false);
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [subjects, user]);

  const addSubject = () => {
    if (!newName.trim()) return;
    const created: Subject = {
      id: Date.now().toString(),
      name: newName.trim(),
      total: 20,
      attended: 18,
      required: 75,
    };
    setSubjects(prev => [...prev, created]);
    setNewName("");
    setIsAdding(false);
    setTimeout(() => setSelectedId(created.id), 250);
  };

  const updateSubject = (id: string, changes: Partial<Subject>) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
  };

  const deleteSubject = (id: string) => {
    setSelectedId(null);
    setTimeout(() => setSubjects(prev => prev.filter(s => s.id !== id)), 300);
  };

  const selected = subjects.find(s => s.id === selectedId) ?? null;

  const calcPct   = (s: Subject) => s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0;
  const calcSafe  = (s: Subject) => calcPct(s) >= s.required;
  const calcSkips = (s: Subject) => Math.max(0, Math.floor((s.attended / (s.required / 100)) - s.total));

  // Detail view values
  const detailPct   = selected ? calcPct(selected) : 0;
  const detailSafe  = selected ? calcSafe(selected) : false;
  const detailSkips = selected ? calcSkips(selected) : 0;
  const R = 80;
  const CIRC = 2 * Math.PI * R;
  const dashOffset = CIRC - (detailPct / 100) * CIRC;

  const cardBg = (safe: boolean) => safe
    ? "bg-[#8FB996] text-white dark:bg-[#292524] dark:border-2 dark:border-emerald-500/30 dark:text-emerald-100"
    : "bg-[#ff6b6b] text-white dark:bg-[#292524] dark:border-2 dark:border-red-500/30 dark:text-red-100";

  const ringStroke = (safe: boolean) => safe
    ? "stroke-white dark:stroke-emerald-400"
    : "stroke-white dark:stroke-red-400";

  const E = [0.16, 1, 0.3, 1] as const;
  const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7] dark:bg-[#1C1917]">
      <Loader2 className="animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#FDFBF7] dark:bg-[#1C1917] safe-top font-sans transition-colors duration-500">
      <div className="flex flex-col px-6 pb-12 w-full md:max-w-xl md:mx-auto">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/">
          <button className="bg-gray-200 dark:bg-[#292524] p-3 rounded-full text-gray-600 dark:text-gray-300 hover:scale-105 transition-all">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <span className="text-gray-400 dark:text-gray-500 font-bold tracking-widest text-sm">ATTENDANCE</span>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {saving && (
              <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                <Loader2 size={14} className="animate-spin text-gray-400" />
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] p-3 rounded-full hover:scale-105 transition-all active:scale-95 shadow-sm"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* TITLE + SUMMARY */}
      <div className="mb-6">
        <h1 className="text-[#2D3436] dark:text-[#E7E5E4] text-3xl font-bold">Bunk Budget</h1>
        {subjects.length > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-gray-400 dark:text-gray-600 text-sm mt-1 font-medium"
          >
            {subjects.filter(s => calcSafe(s)).length} of {subjects.length} subjects safe
          </motion.p>
        )}
      </div>

      {/* EMPTY STATE */}
      {subjects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: E, delay: 0.08 }}
          className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-20"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="h-20 w-20 rounded-full bg-gray-100 dark:bg-[#292524] flex items-center justify-center"
          >
            <BookOpen size={32} className="text-gray-300 dark:text-gray-600" />
          </motion.div>
          <p className="text-gray-500 dark:text-gray-500 font-bold">No subjects yet</p>
          <p className="text-gray-300 dark:text-gray-700 text-sm">Tap + to track your first subject</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAdding(true)}
            className="mt-2 px-6 py-3 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] rounded-2xl font-bold text-sm"
          >
            Add Subject
          </motion.button>
        </motion.div>
      )}

      {/* SUBJECT CARDS */}
      <LayoutGroup>
        <motion.div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {subjects.map((s, i) => {
              const pct   = calcPct(s);
              const safe  = calcSafe(s);
              const skips = calcSkips(s);
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 24, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: E, delay: i * 0.05 } }}
                  exit={{ opacity: 0, x: -30, scale: 0.9, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedId(s.id)}
                  className={`rounded-[25px] p-5 flex items-center justify-between cursor-pointer ${cardBg(safe)} transition-colors duration-500`}
                >
                  {/* LEFT: ring + info */}
                  <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center">
                      <MiniRing pct={pct} safe={safe} />
                      <span className="absolute text-[11px] font-bold" style={{ transform: "rotate(90deg) translateY(-50%)", marginTop: 0 }}>
                        {/* Overlay label handled below via absolute */}
                      </span>
                      {/* Percentage overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-white dark:text-current leading-none">{pct}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-base leading-tight">{s.name}</p>
                      <p className="text-xs opacity-70 mt-0.5 font-medium">{s.attended}/{s.total} classes</p>
                    </div>
                  </div>

                  {/* RIGHT: badge */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className={`px-3 py-1 rounded-xl ${safe ? "bg-white/20 dark:bg-emerald-500/10" : "bg-white/25 dark:bg-red-500/10"}`}>
                      <span className="text-xs font-bold">{safe ? "Safe" : "Danger!"}</span>
                    </div>
                    <span className="text-[10px] opacity-60 font-medium pr-1">
                      {safe ? `${skips} skip${skips !== 1 ? "s" : ""} left` : "Attend class"}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {/* ── ADD SUBJECT MODAL ── */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center"
            onClick={() => { setIsAdding(false); setNewName(""); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={spring}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#292524] w-full max-w-md p-6 rounded-t-[30px] sm:rounded-[30px] shadow-2xl border dark:border-[#44403C] space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-[#2D3436] dark:text-[#E7E5E4]">New Subject</h3>
                <button onClick={() => { setIsAdding(false); setNewName(""); }} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addSubject()}
                placeholder="e.g. Mathematics"
                className="w-full p-4 bg-gray-100 dark:bg-[#1C1917] rounded-xl text-gray-900 dark:text-[#E7E5E4] outline-none border-2 border-transparent focus:border-[#8FB996] transition-colors"
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={addSubject}
                disabled={!newName.trim()}
                className="w-full py-4 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] rounded-2xl font-bold disabled:opacity-30 transition-all"
              >
                Add Subject
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SUBJECT DETAIL SHEET ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 backdrop-blur-[2px]"
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              key="detail-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ ...spring, stiffness: 280, damping: 32 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#FDFBF7] dark:bg-[#1C1917] w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-4 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* Sheet header */}
              <div className="px-6 pt-4 pb-4 flex justify-between items-start">
                <div className="flex-1 mr-4">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Subject</p>
                  <input
                    value={selected.name}
                    onChange={e => updateSubject(selected.id, { name: e.target.value })}
                    className="text-2xl font-bold text-[#2D3436] dark:text-[#E7E5E4] bg-transparent outline-none border-b-2 border-transparent focus:border-[#8FB996] transition-colors w-full"
                  />
                </div>
                <div className="flex items-center gap-2 pt-3">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => deleteSubject(selected.id)}
                    className="p-2 rounded-full text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-all"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedId(null)}
                    className="p-2 rounded-full bg-gray-100 dark:bg-[#292524] text-gray-500 dark:text-gray-300 hover:scale-105 transition-all"
                  >
                    <X size={18} />
                  </motion.button>
                </div>
              </div>

              <div className="px-6 pb-10 space-y-5">
                {/* DONUT CARD */}
                <motion.div
                  key={`card-${selected.id}-${detailSafe}`}
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring }}
                  className={`rounded-[30px] p-6 shadow-xl flex flex-col items-center text-center transition-colors duration-500 ${cardBg(detailSafe)}`}
                >
                  <div className="relative h-48 w-48 mb-4">
                    <svg className="h-full w-full transform -rotate-90">
                      <circle cx="96" cy="96" r={R} className="stroke-white/20 dark:stroke-gray-700" strokeWidth="12" fill="transparent" />
                      <motion.circle
                        key={`ring-${selected.id}-${detailPct}`}
                        initial={{ strokeDashoffset: CIRC }}
                        animate={{ strokeDashoffset: dashOffset }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        cx="96" cy="96" r={R}
                        className={ringStroke(detailSafe)}
                        strokeWidth="12" fill="transparent"
                        strokeDasharray={CIRC}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span
                        key={detailPct}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.25 }}
                        className="text-4xl font-bold text-white dark:text-current"
                      >
                        {detailPct}%
                      </motion.span>
                      <span className="text-xs opacity-75 uppercase font-bold mt-1 text-white dark:text-current">Attendance</span>
                    </div>
                  </div>

                  <div className="bg-white/20 dark:bg-black/20 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-3 w-full justify-center">
                    {detailSafe
                      ? <CheckCircle size={18} className="text-white dark:text-current shrink-0" />
                      : <AlertTriangle size={18} className="text-white dark:text-current shrink-0" />}
                    <p className="text-white dark:text-current font-bold text-sm">
                      {detailSafe
                        ? `Safe! You can skip ${detailSkips} more class${detailSkips !== 1 ? "es" : ""}.`
                        : "DANGER! You need to attend class!"}
                    </p>
                  </div>
                </motion.div>

                {/* SLIDERS CARD */}
                <div className="bg-white dark:bg-[#292524] rounded-[25px] p-5 shadow-sm space-y-5 transition-colors duration-500">

                  {/* Attended */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-gray-500 dark:text-gray-400 font-bold text-sm">Classes Attended</label>
                      <motion.span
                        key={selected.attended}
                        initial={{ scale: 1.3, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-[#2D3436] dark:text-white font-bold tabular-nums"
                      >
                        {selected.attended}
                      </motion.span>
                    </div>
                    <input
                      type="range" min="0" max={selected.total} value={selected.attended}
                      onChange={e => updateSubject(selected.id, { attended: parseInt(e.target.value) })}
                      className="w-full h-3 bg-gray-100 dark:bg-[#44403C] rounded-full appearance-none cursor-pointer accent-[#2D3436] dark:accent-white"
                    />
                  </div>

                  {/* Total */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-gray-500 dark:text-gray-400 font-bold text-sm">Total Classes Held</label>
                      <motion.span
                        key={selected.total}
                        initial={{ scale: 1.3, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-[#2D3436] dark:text-white font-bold tabular-nums"
                      >
                        {selected.total}
                      </motion.span>
                    </div>
                    <input
                      type="range" min="1" max="100" value={selected.total}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        updateSubject(selected.id, { total: val, attended: Math.min(selected.attended, val) });
                      }}
                      className="w-full h-3 bg-gray-100 dark:bg-[#44403C] rounded-full appearance-none cursor-pointer accent-[#2D3436] dark:accent-white"
                    />
                  </div>

                  {/* Required % */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <label className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-3 block">Minimum Requirement</label>
                    <div className="flex gap-2">
                      {[70, 75, 80, 85].map(pct => (
                        <motion.button
                          key={pct}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => updateSubject(selected.id, { required: pct })}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                            selected.required === pct
                              ? "bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] shadow-sm"
                              : "bg-gray-100 dark:bg-[#44403C] text-gray-400 dark:text-gray-300"
                          }`}
                        >
                          {pct}%
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* DELETE */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => deleteSubject(selected.id)}
                  className="w-full py-4 border-2 border-red-100 dark:border-red-900/30 text-red-400 dark:text-red-500 font-bold rounded-[25px] hover:bg-red-50 dark:hover:bg-red-900/10 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Trash2 size={16} />
                  Remove Subject
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
