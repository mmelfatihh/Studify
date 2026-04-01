"use client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, AlertTriangle, TrendingUp, CheckCircle, Settings,
  User, Edit2, PlayCircle, ArrowRight, Flame, GraduationCap, ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";

// ─── Shared animation primitives ────────────────────────────────────────────
const E = [0.16, 1, 0.3, 1] as const; // silky expo-out
const fadeUp = (delay = 0, duration = 0.5) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration, ease: E, delay },
});
const SHEET = { type: "spring" as const, stiffness: 300, damping: 30 };
// ────────────────────────────────────────────────────────────────────────────

function getGradePoints(pct: number): number {
  if (pct >= 90) return 4.0; if (pct >= 85) return 3.7; if (pct >= 80) return 3.3;
  if (pct >= 75) return 3.0; if (pct >= 70) return 2.7; if (pct >= 65) return 2.3;
  if (pct >= 60) return 2.0; if (pct >= 55) return 1.7; if (pct >= 50) return 1.0;
  return 0.0;
}

function GPAWidget({ gpa, hasData }: { gpa: number; hasData: boolean }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(gpa / 4.0, 1);
  const label = gpa >= 3.5 ? "Dean's List" : gpa >= 2.5 ? "Keep it up" : "Needs work";

  return (
    <div className="flex items-center gap-4">
      {/* Animated ring */}
      <div className="relative w-16 h-16 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} stroke="rgba(255,255,255,0.2)" strokeWidth="5" fill="transparent" />
          <motion.circle
            cx="32" cy="32" r={r}
            stroke="white"
            strokeWidth="5"
            fill="transparent"
            strokeDasharray={circ}
            animate={{ strokeDashoffset: hasData ? circ - frac * circ : circ }}
            transition={{ duration: 1.1, ease: E, delay: 0.3 }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-[11px] font-black leading-none">
            {hasData ? gpa.toFixed(1) : "--"}
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-0.5">GPA Tracker</p>
        {hasData ? (
          <>
            <h3 className="text-2xl font-black text-white leading-none">{gpa.toFixed(2)}</h3>
            <p className="text-white/50 text-xs mt-0.5 font-medium">{label}</p>
          </>
        ) : (
          <>
            <h3 className="text-sm font-bold text-white leading-tight">Track your GPA</h3>
            <p className="text-white/50 text-xs mt-0.5">Tap to get started</p>
          </>
        )}
      </div>

      <ChevronRight size={18} className="text-white/30 shrink-0" />
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({ name: "Student", major: "General" });
  const [activeTask, setActiveTask] = useState({ subject: "Free time", title: "Enjoy your day" });
  const [examData, setExamData] = useState({ subject: "Set Goal", daysLeft: 0, prepLevel: 50, count: 0 });
  const [attendance, setAttendance] = useState({
    skipsLeft: 0, isSafe: true, worstSubject: "", worstPct: 0, totalSubjects: 0,
  });
  const [gpaData, setGpaData] = useState({ gpa: 0, hasData: false });
  const [streak, setStreak] = useState(0);

  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editForm, setEditForm] = useState({ subject: "", title: "" });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (cu) => {
      if (!cu) { router.push("/login"); return; }
      setUser(cu);

      const profileSnap = await getDoc(doc(db, "users", cu.uid));
      if (profileSnap.exists()) setProfile(profileSnap.data() as any);
      else { router.push("/setup"); return; }

      const dashSnap = await getDoc(doc(db, "users", cu.uid, "dashboard", "data"));
      if (dashSnap.exists() && dashSnap.data().activeTask) setActiveTask(dashSnap.data().activeTask);

      const streakSnap = await getDoc(doc(db, "users", cu.uid, "streak", "data"));
      if (streakSnap.exists()) setStreak(streakSnap.data().current ?? 0);

      const attSnap = await getDoc(doc(db, "users", cu.uid, "attendance", "subjects"));
      if (attSnap.exists() && attSnap.data().list?.length > 0) {
        const list: any[] = attSnap.data().list;
        const enriched = list.map((s) => ({
          name: s.name,
          pct: s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0,
          skips: Math.max(0, Math.floor((s.attended / (s.required / 100)) - s.total)),
          safe: s.total > 0 && Math.round((s.attended / s.total) * 100) >= s.required,
        }));
        const minSkips = Math.min(...enriched.map((x) => x.skips));
        const worst = enriched.find((x) => x.skips === minSkips) || enriched[0];
        setAttendance({
          skipsLeft: minSkips, isSafe: enriched.every((x) => x.safe),
          worstSubject: worst.name, worstPct: worst.pct, totalSubjects: list.length,
        });
      }

      const examSnap = await getDoc(doc(db, "users", cu.uid, "exams", "data"));
      if (examSnap.exists() && examSnap.data().list?.length > 0) {
        const list: any[] = examSnap.data().list;
        const withDays = list.map((e) => ({
          ...e, daysLeft: Math.ceil((new Date(e.date).getTime() - Date.now()) / 86400000),
        }));
        const upcoming = withDays.filter((e) => e.daysLeft > 0).sort((a, b) => a.daysLeft - b.daysLeft);
        const soonest = upcoming[0] || withDays[0];
        setExamData({ subject: soonest.subject, daysLeft: Math.max(0, soonest.daysLeft), prepLevel: soonest.prepLevel, count: list.length });
      } else {
        const savedSubject = localStorage.getItem("examSubject");
        const savedDate = localStorage.getItem("examDate");
        const savedPrep = localStorage.getItem("examPrep");
        const days = savedDate ? Math.ceil((new Date(savedDate).getTime() - Date.now()) / 86400000) : 0;
        setExamData({ subject: savedSubject || "No Exam Set", daysLeft: days > 0 ? days : 0, prepLevel: savedPrep ? parseInt(savedPrep) : 50, count: savedSubject ? 1 : 0 });
      }

      const gradesSnap = await getDoc(doc(db, "users", cu.uid, "grades", "data"));
      if (gradesSnap.exists() && gradesSnap.data().list?.length > 0) {
        const list: any[] = gradesSnap.data().list;
        const totalCr = list.reduce((a, s) => a + s.credits, 0);
        if (totalCr > 0) {
          const weighted = list.reduce((a, s) => a + getGradePoints(s.percentage) * s.credits, 0);
          setGpaData({ gpa: Math.round((weighted / totalCr) * 100) / 100, hasData: true });
        }
      }

      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const saveTaskEdit = async () => {
    if (!user) return;
    const newTask = {
      subject: editForm.subject.trim() || "Free time",
      title: editForm.title.trim() || "Enjoy your day",
    };
    setActiveTask(newTask);
    setIsEditingTask(false);
    await setDoc(doc(db, "users", user.uid, "dashboard", "data"), { activeTask: newTask }, { merge: true });
  };

  const getExamTheme = () => {
    const l = examData.prepLevel;
    if (l < 30) return "bg-[#ff6b6b] text-white dark:bg-[#292524] dark:text-red-200 dark:border-2 dark:border-red-400/20";
    if (l < 70) return "bg-[#feca57] text-[#2D3436] dark:bg-[#292524] dark:text-orange-200 dark:border-2 dark:border-orange-400/20";
    return "bg-[#1dd1a1] text-white dark:bg-[#292524] dark:text-emerald-200 dark:border-2 dark:border-emerald-400/20";
  };

  if (loading) return <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#1C1917]" />;

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFBF7] dark:bg-[#1C1917] text-[#2D3436] dark:text-[#E7E5E4] px-6 safe-top pb-6 font-sans transition-colors duration-500 md:px-10 md:py-8">

      {/* ── HEADER ── */}
      <motion.div
        {...fadeUp(0, 0.4)}
        className="flex items-center justify-between mb-8 md:max-w-5xl md:mx-auto md:w-full"
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-[#4A4E69] dark:text-[#E7E5E4] truncate">Hi, {profile.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[#9A8C98] dark:text-gray-500 font-medium text-sm">{profile.major}</p>
            {streak > 0 && (
              <motion.div
                {...fadeUp(0.25)}
                className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 px-2 py-0.5 rounded-full"
              >
                <Flame size={12} />
                <span className="text-[11px] font-black">{streak}</span>
              </motion.div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 md:hidden shrink-0 ml-4">
          <Link href="/setup">
            <button className="h-10 w-10 rounded-full bg-gray-200 dark:bg-[#292524] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-300 transition-colors">
              <User size={18} />
            </button>
          </Link>
          <Link href="/settings">
            <button className="h-10 w-10 rounded-full bg-[#C9ADA7] dark:bg-[#292524] border-2 border-white dark:border-[#44403C] shadow-sm flex items-center justify-center text-white dark:text-gray-300 hover:bg-red-400 dark:hover:bg-red-900/30 transition-colors">
              <Settings size={18} />
            </button>
          </Link>
        </div>
      </motion.div>

      {/* ── DESKTOP 2-COL / MOBILE STACK ── */}
      <div className="md:max-w-5xl md:mx-auto md:w-full md:grid md:grid-cols-[1.15fr_1fr] md:gap-6 md:items-start">

        {/* ── HERO CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: E, delay: 0.06 }}
          className="relative w-full h-80 mb-6 md:mb-0 md:h-[520px]"
        >
          <div className="absolute top-4 left-0 w-full h-full bg-[#E8E8E4] dark:bg-black/40 rounded-[30px] transform scale-95 opacity-60 z-0 transition-colors" />
          <div className="absolute top-0 left-0 w-full h-full
            bg-[#8FB996] text-white
            dark:bg-[#292524] dark:text-emerald-100 dark:border-2 dark:border-emerald-500/20
            rounded-[30px] shadow-2xl p-6 flex flex-col justify-between z-10 transition-colors duration-500">
            <div className="flex justify-between items-start">
              <div className="bg-white/20 dark:bg-emerald-500/10 backdrop-blur-md px-4 py-2 rounded-2xl">
                <span className="font-bold text-sm dark:text-emerald-200">Now Active</span>
              </div>
              <button
                onClick={() => { setEditForm({ subject: activeTask.subject, title: activeTask.title }); setIsEditingTask(true); }}
                className="p-2 bg-white/10 dark:bg-emerald-500/10 rounded-full hover:bg-white/25 dark:hover:bg-emerald-500/20 transition-colors active:scale-95"
              >
                <Edit2 size={16} className="dark:text-emerald-200" />
              </button>
            </div>

            <Link href="/schedule" className="block">
              <h2 className="text-3xl font-bold mb-2 dark:text-emerald-200">{activeTask.subject}</h2>
              <p className="opacity-90 text-lg dark:text-gray-400">{activeTask.title}</p>
              <div className="mt-3 flex items-center gap-2 overflow-hidden">
                <svg width="100" height="22" viewBox="0 0 100 22" fill="none">
                  <motion.path
                    d="M4 16 C20 16 45 4 82 10 L74 5 L82 10 L74 15"
                    stroke="rgba(255,255,255,0.55)" strokeWidth="1.6"
                    strokeLinecap="round" strokeLinejoin="round" fill="none"
                    animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.6, 0.6, 0] }}
                    transition={{ duration: 2.4, times: [0, 0.5, 0.78, 1], repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                  />
                </svg>
                <motion.span
                  animate={{ opacity: [0, 0, 0.55, 0.55, 0], x: [0, -6, 0, 0, 6] }}
                  transition={{ duration: 2.4, times: [0, 0.12, 0.45, 0.78, 1], repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                  className="text-white/55 text-[11px] font-bold tracking-widest uppercase whitespace-nowrap"
                >
                  Tap to plan your day
                </motion.span>
              </div>
            </Link>

            <Link href="/focus" className="w-full">
              <button className="w-full bg-white dark:bg-[#44403C] text-[#5F8D6B] dark:text-emerald-200 font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-[#F0F7F4] dark:hover:bg-[#57534E] transition-colors active:scale-[0.98]">
                <BookOpen size={20} />
                Enter Focus Room
              </button>
            </Link>
          </div>
        </motion.div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex flex-col gap-4">

          {/* Row: Exam Pulse + Bunk Budget */}
          <div className="grid grid-cols-2 gap-4">

            {/* EXAM PULSE */}
            <Link href="/exam">
              <motion.div
                {...fadeUp(0.13)}
                whileTap={{ scale: 0.97 }}
                className={`rounded-[25px] p-5 h-48 flex flex-col justify-between shadow-lg cursor-pointer hover:brightness-105 transition-all duration-200 ${getExamTheme()}`}
              >
                <div className="flex justify-between items-center opacity-70">
                  <span className="font-bold text-[11px] uppercase tracking-widest">Exam Pulse</span>
                  {examData.count > 1 && (
                    <span className="text-[10px] font-black bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full">
                      {examData.count}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-0.5">Next up</p>
                  <h3 className="text-xl font-black leading-tight truncate mb-1">{examData.subject}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">{examData.daysLeft}</span>
                    <span className="text-xs font-bold opacity-60">days left</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold opacity-50">{examData.prepLevel}% ready</span>
                    {examData.prepLevel > 70 ? <CheckCircle size={14} className="opacity-70" /> : <AlertTriangle size={14} className="opacity-70" />}
                  </div>
                  <div className="w-full bg-black/10 dark:bg-black/40 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-white/90 dark:bg-current rounded-full transition-all duration-1000" style={{ width: `${examData.prepLevel}%` }} />
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* BUNK BUDGET */}
            <Link href="/attendance">
              <motion.div
                {...fadeUp(0.18)}
                whileTap={{ scale: 0.97 }}
                className="bg-[#FFDAC1] text-[#B07D62] dark:bg-[#292524] dark:text-orange-200 dark:border-2 dark:border-orange-400/20 rounded-[25px] p-5 h-48 flex flex-col justify-between shadow-lg cursor-pointer hover:brightness-105 transition-all duration-200"
              >
                <div className="flex justify-between items-center opacity-70">
                  <span className="font-bold text-[11px] uppercase tracking-widest">Bunk Budget</span>
                  <TrendingUp size={15} />
                </div>

                {attendance.totalSubjects === 0 ? (
                  <div className="flex-1 flex items-center">
                    <p className="text-sm font-bold opacity-50 leading-tight">No subjects<br />tracked yet</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest truncate mb-0.5">
                      {attendance.worstSubject}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black">{attendance.worstPct}%</span>
                      <span className="text-[10px] font-bold opacity-50">present</span>
                    </div>
                    <p className="text-[11px] font-bold opacity-60 mt-0.5">
                      {attendance.skipsLeft} skip{attendance.skipsLeft !== 1 ? "s" : ""} left
                    </p>
                  </div>
                )}

                <div className={`self-start px-2.5 py-1 rounded-lg ${attendance.isSafe ? "bg-white/40 dark:bg-orange-500/10" : "bg-red-500/20"}`}>
                  <span className={`text-[10px] font-black ${attendance.isSafe ? "text-current" : "text-red-700 dark:text-red-400"}`}>
                    {attendance.totalSubjects === 0 ? "Add subjects" : attendance.isSafe ? "Safe Zone" : "Danger!"}
                  </span>
                </div>
              </motion.div>
            </Link>
          </div>

          {/* ── GPA TRACKER WIDGET ── */}
          <Link href="/grades">
            <motion.div
              {...fadeUp(0.23)}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-[25px] p-5 shadow-lg cursor-pointer hover:brightness-110 transition-all duration-200"
            >
              <GPAWidget gpa={gpaData.gpa} hasData={gpaData.hasData} />
            </motion.div>
          </Link>

          {/* ── SIMULATOR BANNER ── */}
          <Link href="/simulator">
            <motion.div
              {...fadeUp(0.28)}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-[#2D3436] dark:bg-[#292524] dark:border dark:border-[#44403C] text-white dark:text-[#E7E5E4] p-5 rounded-[25px] flex items-center justify-between shadow-xl cursor-pointer hover:brightness-110 transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <PlayCircle size={28} className="shrink-0 dark:text-gray-400" />
                <div>
                  <h3 className="font-bold text-lg">Mock Exam Mode</h3>
                  <p className="text-sm opacity-70 dark:text-gray-500">Test yourself under pressure.</p>
                </div>
              </div>
              <ArrowRight size={20} className="dark:text-gray-500 shrink-0" />
            </motion.div>
          </Link>
        </div>
      </div>

      {/* ── EDIT MODAL ── */}
      <AnimatePresence>
        {isEditingTask && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center"
            onClick={() => setIsEditingTask(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={SHEET}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#292524] w-full max-w-md p-6 rounded-t-[30px] sm:rounded-[30px] shadow-2xl space-y-4 border dark:border-[#44403C]"
            >
              <h3 className="text-lg font-bold text-[#2D3436] dark:text-[#E7E5E4]">Update Task</h3>
              <input
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                placeholder="Subject (e.g. Math)"
                className="w-full p-4 bg-gray-100 dark:bg-[#1C1917] rounded-xl text-gray-900 dark:text-[#E7E5E4] outline-none border border-transparent focus:border-emerald-500 transition-colors"
              />
              <input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Task (e.g. Worksheet 3)"
                className="w-full p-4 bg-gray-100 dark:bg-[#1C1917] rounded-xl text-gray-900 dark:text-[#E7E5E4] outline-none border border-transparent focus:border-emerald-500 transition-colors"
              />
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsEditingTask(false)} className="flex-1 py-3 text-gray-400 font-bold">Cancel</button>
                <button onClick={saveTaskEdit} className="flex-1 py-3 bg-[#2D3436] dark:bg-emerald-700 text-white rounded-xl font-bold">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
