"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, GraduationCap, X, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface Subject {
  id: string;
  name: string;
  credits: number;
  percentage: number;
}

function getGradePoints(pct: number): number {
  if (pct >= 90) return 4.0;
  if (pct >= 85) return 3.7;
  if (pct >= 80) return 3.3;
  if (pct >= 75) return 3.0;
  if (pct >= 70) return 2.7;
  if (pct >= 65) return 2.3;
  if (pct >= 60) return 2.0;
  if (pct >= 55) return 1.7;
  if (pct >= 50) return 1.0;
  return 0.0;
}

function getLetter(pct: number): string {
  if (pct >= 95) return "A+";
  if (pct >= 90) return "A";
  if (pct >= 85) return "A-";
  if (pct >= 80) return "B+";
  if (pct >= 75) return "B";
  if (pct >= 70) return "B-";
  if (pct >= 65) return "C+";
  if (pct >= 60) return "C";
  if (pct >= 55) return "C-";
  if (pct >= 50) return "D";
  return "F";
}

function calcGPA(subjects: Subject[]): number {
  const totalCredits = subjects.reduce((a, s) => a + s.credits, 0);
  if (!totalCredits) return 0;
  const weighted = subjects.reduce((a, s) => a + getGradePoints(s.percentage) * s.credits, 0);
  return Math.round((weighted / totalCredits) * 100) / 100;
}

function getLetterColor(letter: string): string {
  if (letter.startsWith("A")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (letter.startsWith("B")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  if (letter.startsWith("C")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
}

function GPACard({ gpa }: { gpa: number }) {
  const isGreat = gpa >= 3.5;
  const isOk = gpa >= 2.5;
  const label = isGreat ? "Dean's List" : isOk ? "Keep it up" : "Need Improvement";
  const ring = isGreat
    ? "text-emerald-500 dark:text-emerald-400"
    : isOk
    ? "text-amber-500 dark:text-amber-400"
    : "text-red-500 dark:text-red-400";

  const circumference = 2 * Math.PI * 52;
  const fraction = Math.min(gpa / 4.0, 1);

  return (
    <div className="bg-white dark:bg-[#27272A] rounded-[30px] p-6 shadow-sm flex items-center gap-6">
      <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
        <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100 dark:text-[#3F3F46]" />
          <motion.circle
            cx="60" cy="60" r="52"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: circumference - fraction * circumference }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className={ring}
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center z-10">
          <motion.span
            animate={{ opacity: 1 }}
            className={`text-3xl font-black ${ring}`}
          >
            {gpa.toFixed(2)}
          </motion.span>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">GPA</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Cumulative GPA</p>
        <h2 className="text-xl font-black text-[#2D3436] dark:text-white">{label}</h2>
        <p className="text-sm text-gray-400 mt-1">out of 4.00</p>
      </div>
    </div>
  );
}

export default function GradesPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCredits, setNewCredits] = useState(3);
  const [newPct, setNewPct] = useState(75);

  // Detail sheet
  const [selected, setSelected] = useState<Subject | null>(null);

  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  // Auth + load
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid, "grades", "data"));
      if (snap.exists() && snap.data().list) {
        setSubjects(snap.data().list);
      }
      setLoading(false);
      isFirstLoad.current = false;
    });
    return () => unsub();
  }, []);

  // Auto-save
  useEffect(() => {
    if (isFirstLoad.current || !uid) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setDoc(doc(db, "users", uid, "grades", "data"), { list: subjects }, { merge: true });
    }, 600);
  }, [subjects, uid]);

  const addSubject = () => {
    if (!newName.trim()) return;
    const s: Subject = {
      id: Date.now().toString(),
      name: newName.trim(),
      credits: newCredits,
      percentage: newPct,
    };
    setSubjects((prev) => [...prev, s]);
    setNewName("");
    setNewCredits(3);
    setNewPct(75);
    setShowAdd(false);
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setSelected(null);
  };

  const updatePct = (id: string, pct: number) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, percentage: pct } : s)));
    setSelected((prev) => (prev?.id === id ? { ...prev, percentage: pct } : prev));
  };

  const gpa = calcGPA(subjects);

  if (loading) return <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#18181B]" />;

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#18181B] safe-top flex flex-col transition-colors duration-500">
      <div className="flex-1 flex flex-col px-6 pb-8 w-full md:max-w-2xl md:mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/">
            <button className="bg-white dark:bg-[#27272A] p-3 rounded-full shadow-sm text-gray-600 dark:text-gray-200 hover:scale-105 transition-all">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <span className="text-[#2D3436] dark:text-white font-bold tracking-widest opacity-80">GPA TRACKER</span>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] p-3 rounded-full shadow-sm hover:scale-105 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        {subjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center gap-4"
          >
            <GraduationCap size={56} className="text-gray-200 dark:text-[#3F3F46]" />
            <h2 className="text-xl font-bold text-[#2D3436] dark:text-white">No subjects yet</h2>
            <p className="text-gray-400 text-sm max-w-xs">Add your subjects and grades to track your GPA in real time.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-2 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] font-bold px-8 py-4 rounded-[20px] shadow-lg hover:scale-[1.02] transition-all"
            >
              Add First Subject
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
            {/* GPA CARD */}
            <GPACard gpa={gpa} />

            {/* SUBJECT LIST */}
            <div className="grid gap-3 md:grid-cols-2">
              <AnimatePresence>
                {subjects.map((s, i) => {
                  const letter = getLetter(s.percentage);
                  return (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelected(s)}
                      className="bg-white dark:bg-[#27272A] rounded-[24px] p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${getLetterColor(letter)}`}>
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
          </motion.div>
        )}
      </div>

      {/* ADD MODAL */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center" onClick={() => setShowAdd(false)}>
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
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
                className="w-full p-4 bg-gray-100 dark:bg-[#18181B] rounded-xl text-[#2D3436] dark:text-white outline-none border border-transparent focus:border-[#2D3436] dark:focus:border-white transition-colors"
              />

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Credits: {newCredits}</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewCredits(c)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        newCredits === c
                          ? "bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436]"
                          : "bg-gray-100 dark:bg-[#3F3F46] text-gray-400"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Grade: {newPct}% · {getLetter(newPct)} · {getGradePoints(newPct).toFixed(1)} pts
                </label>
                <input
                  type="range" min="0" max="100" value={newPct}
                  onChange={(e) => setNewPct(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-100 dark:bg-[#3F3F46] rounded-full appearance-none cursor-pointer accent-[#2D3436] dark:accent-white"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 text-gray-400 font-bold">Cancel</button>
                <button
                  onClick={addSubject}
                  disabled={!newName.trim()}
                  className="flex-1 py-3 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] rounded-xl font-bold disabled:opacity-40 transition-opacity"
                >
                  Add Subject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL SHEET */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center" onClick={() => setSelected(null)}>
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] w-full max-w-md p-6 rounded-t-[30px] sm:rounded-[30px] shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-[#2D3436] dark:text-white">{selected.name}</h3>
                  <p className="text-sm text-gray-400">{selected.credits} credit{selected.credits > 1 ? "s" : ""}</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${getLetterColor(getLetter(selected.percentage))}`}>
                  {getLetter(selected.percentage)}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#18181B] rounded-2xl p-4 flex justify-between">
                <div className="text-center">
                  <p className="text-2xl font-black text-[#2D3436] dark:text-white">{selected.percentage}%</p>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Score</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-[#2D3436] dark:text-white">{getGradePoints(selected.percentage).toFixed(1)}</p>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Grade Points</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-[#2D3436] dark:text-white">{selected.credits}</p>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Credits</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Adjust Grade</label>
                <input
                  type="range" min="0" max="100"
                  value={selected.percentage}
                  onChange={(e) => updatePct(selected.id, parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-100 dark:bg-[#3F3F46] rounded-full appearance-none cursor-pointer accent-[#2D3436] dark:accent-white"
                />
                <div className="flex justify-between text-xs text-gray-300 dark:text-gray-600">
                  <span>F (0%)</span>
                  <span>A+ (100%)</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => deleteSubject(selected.id)}
                  className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
                <button onClick={() => setSelected(null)} className="flex-1 py-3 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] rounded-xl font-bold">
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
