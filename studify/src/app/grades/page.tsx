"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, GraduationCap, X, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─── Animation primitives ───────────────────────────────────────────────────
const E = [0.16, 1, 0.3, 1] as const;
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: E, delay },
});
const SHEET = { type: "spring" as const, stiffness: 300, damping: 30 };
// ────────────────────────────────────────────────────────────────────────────

interface Subject {
  id: string;
  name: string;
  credits: number;
  percentage: number;
}

function getGradePoints(pct: number): number {
  if (pct >= 90) return 4.0; if (pct >= 85) return 3.7; if (pct >= 80) return 3.3;
  if (pct >= 75) return 3.0; if (pct >= 70) return 2.7; if (pct >= 65) return 2.3;
  if (pct >= 60) return 2.0; if (pct >= 55) return 1.7; if (pct >= 50) return 1.0;
  return 0.0;
}

function getLetter(pct: number): string {
  if (pct >= 95) return "A+"; if (pct >= 90) return "A"; if (pct >= 85) return "A-";
  if (pct >= 80) return "B+"; if (pct >= 75) return "B"; if (pct >= 70) return "B-";
  if (pct >= 65) return "C+"; if (pct >= 60) return "C"; if (pct >= 55) return "C-";
  if (pct >= 50) return "D"; return "F";
}

function calcGPA(subjects: Subject[]): number {
  const totalCr = subjects.reduce((a, s) => a + s.credits, 0);
  if (!totalCr) return 0;
  return Math.round(subjects.reduce((a, s) => a + getGradePoints(s.percentage) * s.credits, 0) / totalCr * 100) / 100;
}

function getLetterColor(letter: string) {
  if (letter.startsWith("A")) return { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" };
  if (letter.startsWith("B")) return { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300" };
  if (letter.startsWith("C")) return { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300" };
  return { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300" };
}

function GPACard({ gpa, count }: { gpa: number; count: number }) {
  const circumference = 2 * Math.PI * 52;
  const frac = Math.min(gpa / 4.0, 1);
  const isGreat = gpa >= 3.5;
  const isOk = gpa >= 2.5;
  const ringColor = isGreat ? "#10b981" : isOk ? "#f59e0b" : "#ef4444";
  const label = isGreat ? "Dean's List" : isOk ? "Keep it up" : "Needs improvement";

  return (
    <motion.div
      {...fadeUp(0.08)}
      className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-[30px] p-6 shadow-lg flex items-center gap-6"
    >
      {/* Ring */}
      <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
        <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.15)" strokeWidth="8" fill="transparent" />
          <motion.circle
            cx="60" cy="60" r="52"
            stroke="white"
            strokeWidth="8" fill="transparent"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: circumference - frac * circumference }}
            transition={{ duration: 1.2, ease: E, delay: 0.2 }}
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center z-10">
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: E, delay: 0.4 }}
            className="text-3xl font-black text-white"
          >
            {gpa.toFixed(2)}
          </motion.span>
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-0.5">GPA</p>
        </div>
      </div>

      {/* Info */}
      <div>
        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Cumulative</p>
        <h2 className="text-xl font-black text-white">{label}</h2>
        <p className="text-white/40 text-sm mt-0.5">out of 4.00 · {count} subject{count !== 1 ? "s" : ""}</p>
      </div>
    </motion.div>
  );
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
    setSubjects((p) => p.map((s) => (s.id === id ? { ...s, percentage: pct } : s)));
    setSelected((p) => (p?.id === id ? { ...p, percentage: pct } : p));
  };

  const gpa = calcGPA(subjects);

  if (loading) return <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#18181B]" />;

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#18181B] safe-top flex flex-col transition-colors duration-500">
      <div className="flex-1 flex flex-col px-6 pb-8 w-full md:max-w-2xl md:mx-auto">

        {/* HEADER */}
        <motion.div {...fadeUp(0)} className="flex justify-between items-center mb-8">
          <Link href="/">
            <button className="bg-white dark:bg-[#27272A] p-3 rounded-full shadow-sm text-gray-600 dark:text-gray-200 active:scale-95 transition-transform">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <span className="text-[#2D3436] dark:text-white font-bold tracking-widest opacity-80">GPA TRACKER</span>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] p-3 rounded-full shadow-sm active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </motion.div>

        {subjects.length === 0 ? (
          <motion.div {...fadeUp(0.08)} className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="h-20 w-20 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center shadow-lg"
            >
              <GraduationCap size={32} className="text-white" />
            </motion.div>
            <h2 className="text-xl font-bold text-[#2D3436] dark:text-white">No subjects yet</h2>
            <p className="text-gray-400 text-sm max-w-xs">Add your subjects and grades to track your GPA in real time.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-2 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-white font-bold px-8 py-4 rounded-[20px] shadow-lg active:scale-[0.98] transition-transform"
            >
              Add First Subject
            </button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* GPA CARD */}
            <GPACard gpa={gpa} count={subjects.length} />

            {/* SUBJECT LIST */}
            <div className="grid gap-3 md:grid-cols-2">
              <AnimatePresence>
                {subjects.map((s, i) => {
                  const letter = getLetter(s.percentage);
                  const lc = getLetterColor(letter);
                  return (
                    <motion.button
                      key={s.id}
                      {...fadeUp(0.13 + i * 0.05)}
                      whileTap={{ scale: 0.97 }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                      onClick={() => setSelected(s)}
                      className="bg-white dark:bg-[#27272A] rounded-[24px] p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${lc.bg} ${lc.text}`}>
                          {letter}
                        </div>
                        <div>
                          <h3 className="font-bold text-[#2D3436] dark:text-white leading-tight">{s.name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{s.credits} cr · {s.percentage}% · {getGradePoints(s.percentage).toFixed(1)} pts</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD MODAL ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={SHEET}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] w-full max-w-md p-6 rounded-t-[30px] sm:rounded-[30px] shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-[#2D3436] dark:text-white">Add Subject</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3F3F46] transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Subject name (e.g. Mathematics)"
                className="w-full p-4 bg-gray-100 dark:bg-[#18181B] rounded-xl text-[#2D3436] dark:text-white outline-none border border-transparent focus:border-[#4F46E5] transition-colors"
              />

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Credits</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewCredits(c)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        newCredits === c
                          ? "bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-white shadow-sm"
                          : "bg-gray-100 dark:bg-[#3F3F46] text-gray-400"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Grade</label>
                  <span className="text-sm font-black text-[#2D3436] dark:text-white">
                    {newPct}% · {getLetter(newPct)} · {getGradePoints(newPct).toFixed(1)} pts
                  </span>
                </div>
                <input
                  type="range" min="0" max="100" value={newPct}
                  onChange={(e) => setNewPct(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-100 dark:bg-[#3F3F46] rounded-full appearance-none cursor-pointer accent-[#4F46E5]"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 text-gray-400 font-bold">Cancel</button>
                <button
                  onClick={addSubject} disabled={!newName.trim()}
                  className="flex-1 py-3 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-white rounded-xl font-bold disabled:opacity-40 transition-opacity shadow-sm"
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={SHEET}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] w-full max-w-md p-6 rounded-t-[30px] sm:rounded-[30px] shadow-2xl space-y-5"
            >
              <div className="flex justify-center sm:hidden -mt-1 mb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-[#2D3436] dark:text-white">{selected.name}</h3>
                  <p className="text-sm text-gray-400">{selected.credits} credit{selected.credits > 1 ? "s" : ""}</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${getLetterColor(getLetter(selected.percentage)).bg} ${getLetterColor(getLetter(selected.percentage)).text}`}>
                  {getLetter(selected.percentage)}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#18181B] rounded-2xl p-4 flex justify-between">
                {[
                  { label: "Score", value: `${selected.percentage}%` },
                  { label: "Grade Pts", value: getGradePoints(selected.percentage).toFixed(1) },
                  { label: "Credits", value: selected.credits },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-2xl font-black text-[#2D3436] dark:text-white">{value}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Adjust Grade</label>
                  <motion.span
                    key={selected.percentage}
                    initial={{ scale: 1.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="text-sm font-black text-[#2D3436] dark:text-white"
                  >
                    {selected.percentage}%
                  </motion.span>
                </div>
                <input
                  type="range" min="0" max="100" value={selected.percentage}
                  onChange={(e) => updatePct(selected.id, parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-100 dark:bg-[#3F3F46] rounded-full appearance-none cursor-pointer accent-[#4F46E5]"
                />
                <div className="flex justify-between text-xs text-gray-300 dark:text-gray-600">
                  <span>F (0%)</span><span>A+ (100%)</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => deleteSubject(selected.id)}
                  className="p-3.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors active:scale-95"
                >
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
