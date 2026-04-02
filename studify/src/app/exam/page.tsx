"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Zap, AlertCircle, CheckCircle, Calendar, Trash2, X } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─── Animation system ───────────────────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } } };
const slideUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } };
const SHEET = { type: "spring" as const, stiffness: 280, damping: 28 };
// ────────────────────────────────────────────────────────────────────────────

interface Exam {
  id: string;
  subject: string;
  date: string;
  prepLevel: number;
}

function getDaysLeft(dateStr: string): number {
  if (!dateStr) return 0;
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return days > 0 ? days : 0;
}

function getExamTheme(prep: number) {
  if (prep < 30) return { card: "bg-[#ff6b6b] dark:bg-[#3B1818] dark:border dark:border-red-500/30", text: "text-white dark:text-red-100", bar: "bg-white/80 dark:bg-red-400", track: "bg-black/10 dark:bg-red-900/40" };
  if (prep < 70) return { card: "bg-[#feca57] dark:bg-[#2D2210] dark:border dark:border-amber-500/30", text: "text-[#2D3436] dark:text-amber-100", bar: "bg-[#2D3436]/70 dark:bg-amber-400", track: "bg-black/10 dark:bg-amber-900/40" };
  return { card: "bg-[#1dd1a1] dark:bg-[#0D2B24] dark:border dark:border-emerald-500/30", text: "text-white dark:text-emerald-100", bar: "bg-white/80 dark:bg-emerald-400", track: "bg-black/10 dark:bg-emerald-900/40" };
}

function syncToLocalStorage(exams: Exam[]) {
  if (!exams.length) return;
  const sorted = [...exams].sort((a, b) => {
    const da = getDaysLeft(a.date), db2 = getDaysLeft(b.date);
    if (!da && !db2) return 0;
    if (!da) return 1;
    if (!db2) return -1;
    return da - db2;
  });
  localStorage.setItem("examSubject", sorted[0].subject);
  localStorage.setItem("examDate", sorted[0].date);
  localStorage.setItem("examPrep", sorted[0].prepLevel.toString());
}

export default function ExamPulse() {
  const [uid, setUid] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDate, setNewDate] = useState("");
  const [selected, setSelected] = useState<Exam | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid, "exams", "data"));
      if (snap.exists() && snap.data().list) setExams(snap.data().list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Explicit save — only called on intentional user actions, never on every state change
  const saveExams = async (list: Exam[]) => {
    if (!uid) return;
    await setDoc(doc(db, "users", uid, "exams", "data"), { list }, { merge: true });
    syncToLocalStorage(list);
  };

  const addExam = () => {
    if (!newSubject.trim()) return;
    const newList = [...exams, { id: Date.now().toString(), subject: newSubject.trim(), date: newDate, prepLevel: 50 }];
    setExams(newList);
    setNewSubject(""); setNewDate(""); setShowAdd(false);
    saveExams(newList);
  };

  const deleteExam = (id: string) => {
    const newList = exams.filter((e) => e.id !== id);
    setExams(newList);
    setSelected(null);
    saveExams(newList);
  };

  const updatePrep = (id: string, level: number) => {
    setExams((p) => p.map((e) => (e.id === id ? { ...e, prepLevel: level } : e)));
    setSelected((p) => (p?.id === id ? { ...p, prepLevel: level } : p));
  };

  if (loading) return <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#18181B]" />;

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#18181B] safe-top flex flex-col transition-colors duration-500">
      <div className="flex-1 flex flex-col px-6 pb-8 w-full md:max-w-2xl md:mx-auto">

        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="flex justify-between items-center mb-8">
          <Link href="/">
            <button className="bg-white dark:bg-[#27272A] p-3 rounded-full shadow-sm text-gray-600 dark:text-gray-200 active:scale-95 transition-transform">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <span className="text-[#2D3436] dark:text-white font-bold tracking-widest opacity-80">EXAM PULSE</span>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] p-3 rounded-full shadow-sm active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </motion.div>

        {exams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.08 }}
            className="flex-1 flex flex-col items-center justify-center text-center gap-4"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="h-20 w-20 rounded-[24px] bg-[#feca57] flex items-center justify-center shadow-md"
            >
              <Zap size={32} className="text-white" />
            </motion.div>
            <h2 className="text-xl font-bold text-[#2D3436] dark:text-white">No exams tracked</h2>
            <p className="text-[#9A8C98] text-sm max-w-xs">Add your upcoming exams to track your prep and countdown.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-2 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] font-bold px-8 py-4 rounded-[20px] shadow-lg active:scale-[0.98] transition-transform"
            >
              Add First Exam
            </button>
          </motion.div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2">
            <AnimatePresence>
              {exams.map((exam) => {
                const days = getDaysLeft(exam.date);
                const t = getExamTheme(exam.prepLevel);
                return (
                  <motion.button
                    key={exam.id}
                    variants={slideUp}
                    whileTap={{ scale: 0.97 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
                    onClick={() => setSelected(exam)}
                    className={`relative w-full p-6 rounded-[28px] border-2 border-transparent ${t.card} ${t.text} text-left shadow-md hover:brightness-105 transition-all duration-200`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Exam</span>
                      {exam.prepLevel > 70 ? <CheckCircle size={16} className="opacity-70" /> : <AlertCircle size={16} className="opacity-70" />}
                    </div>
                    <h3 className="text-2xl font-black leading-tight mb-1">{exam.subject}</h3>
                    <p className="text-sm font-bold opacity-60 mb-4">
                      {days > 0 ? `${days} days left` : exam.date ? "Today!" : "No date set"}
                    </p>
                    <div className={`w-full ${t.track} h-1.5 rounded-full overflow-hidden`}>
                      <div className={`h-full ${t.bar} rounded-full transition-all duration-700`} style={{ width: `${exam.prepLevel}%` }} />
                    </div>
                    <p className="text-[10px] font-bold opacity-50 mt-1.5">{exam.prepLevel}% ready</p>
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={SHEET}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] w-full max-w-md p-6 rounded-t-[30px] sm:rounded-[30px] shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-[#2D3436] dark:text-white">Add Exam</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3F3F46] transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Subject (e.g. Chemistry)"
                className="w-full p-4 bg-gray-100 dark:bg-[#18181B] rounded-xl text-[#2D3436] dark:text-white outline-none border border-transparent focus:border-[#4F46E5] transition-colors"
              />
              <div className="flex items-center gap-3 bg-gray-100 dark:bg-[#18181B] px-4 py-3 rounded-xl border border-transparent focus-within:border-[#4F46E5] transition-colors">
                <Calendar size={18} className="text-gray-400 shrink-0" />
                <input
                  type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                  className="bg-transparent text-gray-600 dark:text-gray-200 font-medium outline-none text-sm w-full"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 text-gray-400 font-bold">Cancel</button>
                <button
                  onClick={addExam} disabled={!newSubject.trim()}
                  className="flex-1 py-3 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] rounded-xl font-bold disabled:opacity-40 transition-opacity"
                >
                  Add Exam
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
            onClick={() => { saveExams(exams); setSelected(null); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={SHEET}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#27272A] w-full max-w-md p-6 rounded-t-[30px] sm:rounded-[30px] shadow-2xl space-y-5"
            >
              {/* Drag handle */}
              <div className="flex justify-center sm:hidden -mt-1 mb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-[#2D3436] dark:text-white">{selected.subject}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {selected.date ? `${getDaysLeft(selected.date)} days remaining` : "No date set"}
                  </p>
                </div>
                {selected.prepLevel > 70 ? <CheckCircle className="text-emerald-500 mt-1 shrink-0" size={24} /> : <AlertCircle className="text-orange-500 mt-1 shrink-0" size={24} />}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prep Level</label>
                  <motion.span
                    key={selected.prepLevel}
                    initial={{ scale: 1.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className={`text-sm font-black px-3 py-1 rounded-full ${
                      selected.prepLevel > 70 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
                      selected.prepLevel > 30 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    }`}
                  >
                    {selected.prepLevel}%
                  </motion.span>
                </div>
                <div className="relative w-full h-3 bg-gray-100 dark:bg-[#3F3F46] rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${selected.prepLevel}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    className={`h-full rounded-full ${
                      selected.prepLevel < 30 ? "bg-[#ff6b6b]" : selected.prepLevel < 70 ? "bg-[#feca57]" : "bg-[#1dd1a1]"
                    }`}
                  />
                </div>
                <input
                  type="range" min="0" max="100" value={selected.prepLevel}
                  onChange={(e) => updatePrep(selected.id, parseInt(e.target.value))}
                  className="w-full h-2 bg-transparent rounded-full appearance-none cursor-pointer accent-[#2D3436] dark:accent-white"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => deleteExam(selected.id)}
                  className="p-3.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors active:scale-95"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  onClick={() => { saveExams(exams); setSelected(null); }}
                  className="flex-1 py-3 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] rounded-xl font-bold active:scale-[0.98] transition-transform"
                >
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
