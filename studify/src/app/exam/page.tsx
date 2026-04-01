"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, Zap, AlertCircle, CheckCircle, Edit3, Calendar, Trash2, X } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface Exam {
  id: string;
  subject: string;
  date: string;
  prepLevel: number;
}

function getDaysLeft(dateStr: string): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - new Date().getTime();
  const days = Math.ceil(diff / (1000 * 3600 * 24));
  return days > 0 ? days : 0;
}

function getExamTheme(prep: number) {
  if (prep < 30) return { bg: "bg-[#ff6b6b]", dark: "dark:bg-red-900/50 dark:border-red-500/30", text: "text-white", darkText: "dark:text-red-100" };
  if (prep < 70) return { bg: "bg-[#feca57]", dark: "dark:bg-amber-900/50 dark:border-amber-500/30", text: "text-[#2D3436]", darkText: "dark:text-amber-100" };
  return { bg: "bg-[#1dd1a1]", dark: "dark:bg-emerald-900/50 dark:border-emerald-500/30", text: "text-white", darkText: "dark:text-emerald-100" };
}

function syncToLocalStorage(exams: Exam[]) {
  if (exams.length === 0) return;
  const soonest = [...exams].sort((a, b) => {
    const da = getDaysLeft(a.date);
    const db2 = getDaysLeft(b.date);
    if (da === 0 && db2 === 0) return 0;
    if (da === 0) return 1;
    if (db2 === 0) return -1;
    return da - db2;
  })[0];
  localStorage.setItem("examSubject", soonest.subject);
  localStorage.setItem("examDate", soonest.date);
  localStorage.setItem("examPrep", soonest.prepLevel.toString());
}

export default function ExamPulse() {
  const [uid, setUid] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDate, setNewDate] = useState("");

  // Detail sheet
  const [selected, setSelected] = useState<Exam | null>(null);

  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  // Auth + load
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid, "exams", "data"));
      if (snap.exists() && snap.data().list) {
        setExams(snap.data().list);
      }
      setLoading(false);
      isFirstLoad.current = false;
    });
    return () => unsub();
  }, []);

  // Auto-save + sync localStorage
  useEffect(() => {
    if (isFirstLoad.current || !uid) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await setDoc(doc(db, "users", uid, "exams", "data"), { list: exams }, { merge: true });
      syncToLocalStorage(exams);
    }, 600);
  }, [exams, uid]);

  const addExam = () => {
    if (!newSubject.trim()) return;
    const e: Exam = {
      id: Date.now().toString(),
      subject: newSubject.trim(),
      date: newDate,
      prepLevel: 50,
    };
    setExams((prev) => [...prev, e]);
    setNewSubject("");
    setNewDate("");
    setShowAdd(false);
  };

  const deleteExam = (id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
    setSelected(null);
  };

  const updatePrep = (id: string, level: number) => {
    setExams((prev) => prev.map((e) => (e.id === id ? { ...e, prepLevel: level } : e)));
    setSelected((prev) => (prev?.id === id ? { ...prev, prepLevel: level } : prev));
  };

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
          <span className="text-[#2D3436] dark:text-white font-bold tracking-widest opacity-80">EXAM PULSE</span>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] p-3 rounded-full shadow-sm hover:scale-105 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        {exams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center gap-4"
          >
            <Zap size={56} className="text-gray-200 dark:text-[#3F3F46]" />
            <h2 className="text-xl font-bold text-[#2D3436] dark:text-white">No exams tracked</h2>
            <p className="text-gray-400 text-sm max-w-xs">Add your upcoming exams to track your prep and countdown.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-2 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] font-bold px-8 py-4 rounded-[20px] shadow-lg hover:scale-[1.02] transition-all"
            >
              Add First Exam
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 md:grid-cols-2">
            <AnimatePresence>
              {exams.map((exam, i) => {
                const days = getDaysLeft(exam.date);
                const theme = getExamTheme(exam.prepLevel);
                return (
                  <motion.button
                    key={exam.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.07 }}
                    onClick={() => setSelected(exam)}
                    className={`relative w-full p-6 rounded-[28px] border-2 border-transparent ${theme.bg} ${theme.dark} ${theme.text} ${theme.darkText} text-left shadow-md hover:scale-[1.02] transition-all`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-bold uppercase tracking-widest opacity-70">Exam</span>
                      {exam.prepLevel > 70 ? <CheckCircle size={18} className="opacity-80" /> : <AlertCircle size={18} className="opacity-80" />}
                    </div>
                    <h3 className="text-2xl font-black leading-tight mb-1">{exam.subject}</h3>
                    <p className="text-sm font-bold opacity-70 mb-4">
                      {days > 0 ? `${days} days left` : exam.date ? "Today!" : "No date set"}
                    </p>
                    <div className="w-full bg-black/10 dark:bg-black/30 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/80 dark:bg-current transition-all duration-700"
                        style={{ width: `${exam.prepLevel}%` }}
                      />
                    </div>
                    <p className="text-xs font-bold opacity-60 mt-2">{exam.prepLevel}% ready</p>
                  </motion.button>
                );
              })}
            </AnimatePresence>
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
              className="bg-white dark:bg-[#27272A] w-full max-w-md p-6 rounded-t-[30px] sm:rounded-[30px] shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-[#2D3436] dark:text-white">Add Exam</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3F3F46] transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="relative group">
                <input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Subject (e.g. Chemistry)"
                  className="w-full p-4 bg-gray-100 dark:bg-[#18181B] rounded-xl text-[#2D3436] dark:text-white outline-none border border-transparent focus:border-[#2D3436] dark:focus:border-white transition-colors"
                />
                <Edit3 className="absolute top-4 right-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
              </div>

              <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#18181B] px-4 py-3 rounded-xl border border-transparent focus-within:border-[#2D3436] dark:focus-within:border-white transition-colors">
                <Calendar size={18} className="text-gray-400 shrink-0" />
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="bg-transparent text-gray-600 dark:text-gray-200 font-medium outline-none text-sm w-full"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 text-gray-400 font-bold">Cancel</button>
                <button
                  onClick={addExam}
                  disabled={!newSubject.trim()}
                  className="flex-1 py-3 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] rounded-xl font-bold disabled:opacity-40 transition-opacity"
                >
                  Add Exam
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
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-[#2D3436] dark:text-white">{selected.subject}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {selected.date
                      ? `${getDaysLeft(selected.date)} days remaining`
                      : "No date set"}
                  </p>
                </div>
                {selected.prepLevel > 70
                  ? <CheckCircle className="text-emerald-500 mt-1" size={24} />
                  : <AlertCircle className="text-orange-500 mt-1" size={24} />}
              </div>

              {/* Prep meter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Prep Level — {selected.prepLevel}%
                </label>
                <div className="relative w-full h-4 bg-gray-100 dark:bg-[#3F3F46] rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${selected.prepLevel}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.6 }}
                    className={`h-full rounded-full ${
                      selected.prepLevel < 30 ? "bg-[#ff6b6b]" : selected.prepLevel < 70 ? "bg-[#feca57]" : "bg-[#1dd1a1]"
                    }`}
                  />
                </div>
                <input
                  type="range" min="0" max="100"
                  value={selected.prepLevel}
                  onChange={(e) => updatePrep(selected.id, parseInt(e.target.value))}
                  className="w-full h-3 bg-transparent rounded-full appearance-none cursor-pointer accent-[#2D3436] dark:accent-white"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => deleteExam(selected.id)}
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
