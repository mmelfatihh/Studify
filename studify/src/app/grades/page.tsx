"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, GraduationCap, X, Trash2, Star } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─── Animation system ─────────────────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } } };
const slideUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } };
const SHEET = { type: "spring" as const, stiffness: 280, damping: 28 };
// ─────────────────────────────────────────────────────────────────────────

interface Subject { id: string; name: string; credits: number; percentage: number; }

function getGradePoints(pct: number): number {
  if (pct >= 90) return 4.0; if (pct >= 85) return 3.7; if (pct >= 80) return 3.3;
  if (pct >= 75) return 3.0; if (pct >= 70) return 2.7; if (pct >= 65) return 2.3;
  if (pct >= 60) return 2.0; if (pct >= 55) return 1.7; if (pct >= 50) return 1.0;
  return 0.0;
}
function getLetter(pct: number) {
  if (pct >= 95) return "A+"; if (pct >= 90) return "A"; if (pct >= 85) return "A-";
  if (pct >= 80) return "B+"; if (pct >= 75) return "B"; if (pct >= 70) return "B-";
  if (pct >= 65) return "C+"; if (pct >= 60) return "C"; if (pct >= 55) return "C-";
  if (pct >= 50) return "D"; return "F";
}
function calcGPA(subjects: Subject[]) {
  const cr = subjects.reduce((a, s) => a + s.credits, 0);
  if (!cr) return 0;
  return Math.round(subjects.reduce((a, s) => a + getGradePoints(s.percentage) * s.credits, 0) / cr * 100) / 100;
}

// Warm-pastel grade colours aligned with the app theme
function getGradeStyle(pct: number) {
  const l = getLetter(pct);
  if (l.startsWith("A")) return { bar: "bg-[#8FB996]",  badge: "bg-[#8FB996]/20 text-[#4a7a56] dark:bg-emerald-900/40 dark:text-emerald-300" };
  if (l.startsWith("B")) return { bar: "bg-[#FFDAC1]",  badge: "bg-[#FFDAC1] text-[#B07D62] dark:bg-orange-900/40 dark:text-orange-300" };
  if (l.startsWith("C")) return { bar: "bg-[#feca57]",  badge: "bg-[#feca57]/30 text-[#9A6F00] dark:bg-amber-900/40 dark:text-amber-300" };
  return                        { bar: "bg-[#ff6b6b]",  badge: "bg-[#ff6b6b]/20 text-[#cc4444] dark:bg-red-900/40 dark:text-red-300" };
}

// Hero card palette — same warm colours used across the whole app
function getGPAHero(gpa: number) {
  if (gpa >= 3.5) return { bg: "bg-[#8FB996]", ring: "rgba(255,255,255,0.9)", track: "rgba(255,255,255,0.2)", text: "text-white", label: "Dean's List", sublabel: "Outstanding work" };
  if (gpa >= 2.5) return { bg: "bg-[#feca57]", ring: "rgba(45,52,54,0.75)",   track: "rgba(45,52,54,0.12)",  text: "text-[#2D3436]", label: "Good Standing", sublabel: "Keep pushing!" };
  return                 { bg: "bg-[#ff6b6b]", ring: "rgba(255,255,255,0.9)", track: "rgba(255,255,255,0.2)", text: "text-white", label: "Needs Work", sublabel: "You can improve!" };
}

export default function GradesPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCredits, setNewCredits] = useState(3);
  const [newPct, setNewPct] = useState(75);
  const [selected, setSelected] = useState<Subject | null>(null);

  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid, "grades", "data"));
      if (snap.exists() && snap.data().list) setSubjects(snap.data().list);
      setLoading(false);
      isFirstLoad.current = false;
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isFirstLoad.current || !uid) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setDoc(doc(db, "users", uid, "grades", "data"), { list: subjects }, { merge: true });
    }, 600);
  }, [subjects, uid]);

  const addSubject = () => {
    if (!newName.trim()) return;
    setSubjects((p) => [...p, { id: Date.now().toString(), name: newName.trim(), credits: newCredits, percentage: newPct }]);
    setNewName(""); setNewCredits(3); setNewPct(75); setShowAdd(false);
  };
  const deleteSubject = (id: string) => { setSubjects((p) => p.filter((s) => s.id !== id)); setSelected(null); };
  const updatePct = (id: string, pct: number) => {
    setSubjects((p) => p.map((s) => s.id === id ? { ...s, percentage: pct } : s));
    setSelected((p) => p?.id === id ? { ...p, percentage: pct } : p);
  };

  const gpa = calcGPA(subjects);
  const hero = subjects.length > 0 ? getGPAHero(gpa) : null;

  // Big ring params
  const R = 64; const CIRC = 2 * Math.PI * R;
  const frac = subjects.length > 0 ? Math.min(gpa / 4.0, 1) : 0;

  if (loading) return <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#1C1917]" />;

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#1C1917] safe-top flex flex-col transition-colors duration-500">
      <div className="flex-1 flex flex-col px-6 pb-8 w-full md:max-w-2xl md:mx-auto">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex justify-between items-center mb-8"
        >
          <Link href="/">
            <button className="bg-white dark:bg-[#292524] p-3 rounded-full shadow-sm text-gray-600 dark:text-gray-200 active:scale-95 transition-transform">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <span className="text-[#2D3436] dark:text-white font-bold tracking-widest opacity-80">GPA TRACKER</span>
          <button onClick={() => setShowAdd(true)} className="bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] p-3 rounded-full shadow-sm active:scale-95 transition-transform">
            <Plus size={20} />
          </button>
        </motion.div>

        {/* ── EMPTY STATE ── */}
        {subjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.08 }}
            className="flex-1 flex flex-col items-center justify-center text-center gap-5"
          >
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-24 w-24 rounded-[28px] bg-[#8FB996] flex items-center justify-center shadow-lg"
            >
              <GraduationCap size={40} className="text-white" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-[#2D3436] dark:text-white">No subjects yet</h2>
              <p className="text-[#9A8C98] dark:text-gray-500 text-sm mt-1 max-w-xs">Add your courses and let Studify track your GPA automatically.</p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] font-bold px-8 py-4 rounded-[20px] shadow-lg active:scale-[0.98] transition-transform"
            >
              Add First Subject
            </button>
          </motion.div>
        )}

        {/* ── GPA HERO CARD + LIST ── */}
        {subjects.length > 0 && hero && (
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5">

            {/* ── HERO CARD ── */}
            <motion.div variants={slideUp}>
              <div className={`${hero.bg} rounded-[30px] shadow-xl p-6 dark:bg-[#292524] transition-colors duration-500`}>
                {/* top row */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${hero.text} dark:text-current`}>Cumulative GPA</p>
                    <h2 className={`text-3xl font-black mt-0.5 ${hero.text} dark:text-white`}>{hero.label}</h2>
                    <p className={`text-sm opacity-70 font-medium ${hero.text} dark:text-gray-400`}>{hero.sublabel}</p>
                  </div>
                  {gpa >= 3.5 && <Star size={22} className={`${hero.text} opacity-70 dark:text-emerald-400`} fill="currentColor" />}
                </div>

                {/* Ring + stats row */}
                <div className="flex items-center gap-6 mt-2">
                  {/* Ring */}
                  <div className="relative w-36 h-36 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r={R} stroke={hero.track} strokeWidth="10" fill="transparent" />
                      <motion.circle
                        cx="80" cy="80" r={R}
                        stroke={hero.ring}
                        strokeWidth="10" fill="transparent"
                        strokeDasharray={CIRC}
                        animate={{ strokeDashoffset: CIRC - frac * CIRC }}
                        transition={{ duration: 1.3, ease: EASE, delay: 0.25 }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.55, ease: EASE, delay: 0.5 }}
                        className={`text-4xl font-black leading-none ${hero.text} dark:text-white`}
                      >
                        {gpa.toFixed(2)}
                      </motion.span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1 ${hero.text} dark:text-gray-400`}>/ 4.00</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-col gap-3 flex-1">
                    {[
                      { label: "Subjects", value: subjects.length },
                      { label: "Best Grade", value: getLetter(Math.max(...subjects.map(s => s.percentage))) },
                      { label: "Total Credits", value: subjects.reduce((a, s) => a + s.credits, 0) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-black/10 dark:bg-black/20 rounded-2xl px-4 py-2.5">
                        <p className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${hero.text} dark:text-gray-500`}>{label}</p>
                        <p className={`text-xl font-black leading-tight ${hero.text} dark:text-white`}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── SUBJECT LIST ── */}
            <AnimatePresence>
              {subjects.map((s, i) => {
                const style = getGradeStyle(s.percentage);
                const letter = getLetter(s.percentage);
                const pts = getGradePoints(s.percentage);
                return (
                  <motion.button
                    key={s.id}
                    variants={slideUp}
                    whileTap={{ scale: 0.97 }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                    onClick={() => setSelected(s)}
                    className="w-full bg-white dark:bg-[#292524] rounded-[24px] p-5 shadow-sm text-left hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      {/* Grade badge */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 ${style.badge}`}>
                        {letter}
                      </div>

                      {/* Info + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0 mr-2">
                            <p className="font-bold text-[#2D3436] dark:text-white leading-tight truncate">{s.name}</p>
                            <p className="text-xs text-[#9A8C98] dark:text-gray-500 mt-0.5">{s.credits} cr · {pts.toFixed(1)} pts</p>
                          </div>
                          <span className="text-lg font-black text-[#2D3436] dark:text-white shrink-0">{s.percentage}%</span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-100 dark:bg-[#44403C] h-1.5 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${style.bar}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${s.percentage}%` }}
                            transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.04 }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── ADD MODAL ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ y: 36, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 36, opacity: 0 }}
              transition={SHEET}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#292524] w-full max-w-md p-6 rounded-t-[30px] sm:rounded-[30px] shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-[#2D3436] dark:text-white">Add Subject</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3F3F46] transition-colors active:scale-95">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubject()}
                placeholder="Subject name (e.g. Mathematics)"
                className="w-full p-4 bg-gray-100 dark:bg-[#1C1917] rounded-xl text-[#2D3436] dark:text-white outline-none border-2 border-transparent focus:border-[#8FB996] transition-colors"
              />

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#9A8C98] uppercase tracking-wider">Credits</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((c) => (
                    <button key={c} onClick={() => setNewCredits(c)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${newCredits === c ? "bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] shadow-sm" : "bg-gray-100 dark:bg-[#44403C] text-[#9A8C98] dark:text-gray-400"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#9A8C98] uppercase tracking-wider">Grade</label>
                  <span className={`text-sm font-black px-3 py-0.5 rounded-full ${getGradeStyle(newPct).badge}`}>
                    {getLetter(newPct)} · {newPct}%
                  </span>
                </div>
                <input
                  type="range" min="0" max="100" value={newPct}
                  onChange={(e) => setNewPct(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-100 dark:bg-[#44403C] rounded-full appearance-none cursor-pointer accent-[#8FB996]"
                />
                <div className="flex justify-between text-xs text-[#9A8C98]">
                  <span>F · 0%</span><span>A+ · 100%</span>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 text-[#9A8C98] font-bold">Cancel</button>
                <button
                  onClick={addSubject} disabled={!newName.trim()}
                  className="flex-1 py-3 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] rounded-xl font-bold disabled:opacity-30 transition-opacity active:scale-[0.98]"
                >
                  Add Subject
                </button>
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
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 36, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 36, opacity: 0 }}
              transition={SHEET}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#292524] w-full max-w-md p-6 rounded-t-[30px] sm:rounded-[30px] shadow-2xl space-y-5"
            >
              <div className="flex justify-center sm:hidden -mt-1 mb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-[#44403C]" />
              </div>

              {/* Subject header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-[#2D3436] dark:text-white">{selected.name}</h3>
                  <p className="text-sm text-[#9A8C98]">{selected.credits} credit{selected.credits > 1 ? "s" : ""}</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${getGradeStyle(selected.percentage).badge}`}>
                  {getLetter(selected.percentage)}
                </div>
              </div>

              {/* Stats row */}
              <div className="bg-[#FDFBF7] dark:bg-[#1C1917] rounded-2xl p-4 grid grid-cols-3 gap-2">
                {[
                  { label: "Score", value: `${selected.percentage}%` },
                  { label: "Grade Pts", value: getGradePoints(selected.percentage).toFixed(1) },
                  { label: "Credits", value: selected.credits },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-xl font-black text-[#2D3436] dark:text-white">{value}</p>
                    <p className="text-[10px] text-[#9A8C98] font-bold uppercase tracking-wider">{label}</p>
                  </div>
                ))}
              </div>

              {/* Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#9A8C98] uppercase tracking-wider">Adjust Grade</label>
                  <motion.span
                    key={selected.percentage}
                    initial={{ scale: 1.15, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full ${getGradeStyle(selected.percentage).badge}`}
                  >
                    {getLetter(selected.percentage)} · {selected.percentage}%
                  </motion.span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-[#44403C] rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${selected.percentage}%` }}
                    transition={{ type: "spring", stiffness: 180, damping: 24 }}
                    className={`h-full rounded-full ${getGradeStyle(selected.percentage).bar}`}
                  />
                </div>
                <input
                  type="range" min="0" max="100" value={selected.percentage}
                  onChange={(e) => updatePct(selected.id, parseInt(e.target.value))}
                  className="w-full h-2 bg-transparent rounded-full appearance-none cursor-pointer accent-[#8FB996]"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => deleteSubject(selected.id)} className="p-3.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 transition-colors active:scale-95">
                  <Trash2 size={20} />
                </button>
                <button onClick={() => setSelected(null)} className="flex-1 py-3 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] rounded-xl font-bold active:scale-[0.98] transition-transform">
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
