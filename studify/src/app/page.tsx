"use client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
// FIX: Added ArrowLeft to this import list
import { BookOpen, AlertTriangle, TrendingUp, CheckCircle, Settings, User, Edit2, PlayCircle, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- DYNAMIC DATA ---
  const [profile, setProfile] = useState({ name: "Student", major: "General" });
  const [activeTask, setActiveTask] = useState({ subject: "No Task", title: "Set up your profile" });
  const [examData, setExamData] = useState({ subject: "Set Goal", daysLeft: 0, prepLevel: 50 });
  const [attendance, setAttendance] = useState({ skipsLeft: 0, isSafe: true });

  // --- EDIT MODAL STATE ---
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editForm, setEditForm] = useState({ subject: "", title: "" });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      // A. FETCH FIREBASE DATA
      const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (profileSnap.exists()) setProfile(profileSnap.data() as any);
      else router.push("/setup");

      const dashSnap = await getDoc(doc(db, "users", currentUser.uid, "dashboard", "data"));
      if (dashSnap.exists()) {
        const data = dashSnap.data();
        if (data.activeTask) setActiveTask(data.activeTask);
      }

      const attSnap = await getDoc(doc(db, "users", currentUser.uid, "attendance", "stats"));
      if (attSnap.exists()) {
        const d = attSnap.data();
        const currentPct = (d.attended / d.total) * 100;
        const safeSkips = Math.floor((d.attended / (d.required / 100)) - d.total);
        setAttendance({
          skipsLeft: Math.max(0, safeSkips),
          isSafe: currentPct >= d.required
        });
      }

      // B. FETCH LOCAL EXAM DATA
      const savedSubject = localStorage.getItem("examSubject");
      const savedDate = localStorage.getItem("examDate");
      const savedPrep = localStorage.getItem("examPrep");
      let days = 0;
      if (savedDate) {
        const diff = new Date(savedDate).getTime() - new Date().getTime();
        days = Math.ceil(diff / (1000 * 3600 * 24));
      }
      setExamData({
        subject: savedSubject || "No Exam Set",
        daysLeft: days > 0 ? days : 0,
        prepLevel: savedPrep ? parseInt(savedPrep) : 50
      });

      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // --- SAVE QUICK EDIT ---
  const saveTaskEdit = async () => {
    if (!user) return;
    const newTask = { subject: editForm.subject, title: editForm.title };
    setActiveTask(newTask); // Optimistic update
    setIsEditingTask(false);
    await setDoc(doc(db, "users", user.uid, "dashboard", "data"), { activeTask: newTask }, { merge: true });
  };

  const getExamTheme = () => {
    const level = examData.prepLevel;
    if (level < 30) return "bg-[#ff6b6b] dark:bg-red-500/80 text-white"; 
    if (level < 70) return "bg-[#feca57] dark:bg-amber-500/80 text-[#2D3436]"; 
    return "bg-[#1dd1a1] dark:bg-emerald-500/80 text-white"; 
  };

  if (loading) return <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#18181B]" />;

  const springTransition = { type: "spring", stiffness: 200, damping: 20 };

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFBF7] dark:bg-[#18181B] text-[#2D3436] dark:text-[#E4E4E7] px-6 pt-12 pb-6 font-sans transition-colors duration-500">
      
      {/* HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-[#4A4E69] dark:text-white">Hi, {profile.name}</h1>
          <p className="text-[#9A8C98] dark:text-gray-400 font-medium text-sm">{profile.major}</p>
        </div>
        
        <div className="flex items-center gap-3">
           {/* Profile -> Setup */}
           <Link href="/setup">
            <button className="h-10 w-10 rounded-full bg-gray-200 dark:bg-[#27272A] flex items-center justify-center text-gray-500 dark:text-gray-200 hover:bg-gray-300 transition-colors">
              <User size={18} />
            </button>
          </Link>
          
          {/* Gear -> Settings */}
          <Link href="/settings">
            <button className="h-10 w-10 rounded-full bg-[#C9ADA7] dark:bg-[#3F3F46] border-2 border-white dark:border-[#27272A] shadow-sm flex items-center justify-center text-white hover:bg-red-400 dark:hover:bg-red-900 transition-colors">
              <Settings size={18} />
            </button>
          </Link>
        </div>
      </motion.div>

      {/* HERO: ACTIVE TASK */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springTransition}
        className="relative w-full h-80 mb-8"
      >
        <div className="absolute top-4 left-0 w-full h-full bg-[#E8E8E4] dark:bg-[#27272A] rounded-[30px] shadow-sm transform scale-95 opacity-60 z-0 transition-colors"></div>

        <div className="absolute top-0 left-0 w-full h-full bg-[#8FB996] dark:bg-emerald-900/60 dark:border dark:border-emerald-500/30 rounded-[30px] shadow-2xl p-6 flex flex-col justify-between z-10 transition-colors backdrop-blur-sm">
          
          {/* Top Bar with Edit Pencil */}
          <div className="flex justify-between items-start">
            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl">
              <span className="text-white font-bold text-sm">Now Active</span>
            </div>
            <button 
              onClick={() => {
                setEditForm({ subject: activeTask.subject, title: activeTask.title });
                setIsEditingTask(true);
              }}
              className="p-2 bg-white/10 rounded-full hover:bg-white/30 text-white transition-colors"
            >
              <Edit2 size={16} />
            </button>
          </div>

          <Link href="/schedule" className="block group">
            <h2 className="text-white text-3xl font-bold mb-2 group-hover:scale-105 transition-transform origin-left">{activeTask.subject}</h2>
            <p className="text-white/90 text-lg">{activeTask.title}</p>
          </Link>

          <Link href="/focus" className="w-full">
            <button className="w-full bg-white dark:bg-[#27272A] text-[#5F8D6B] dark:text-emerald-400 font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-[#F0F7F4] dark:hover:bg-[#3F3F46] transition-colors">
              <BookOpen size={20} />
              Enter Focus Room
            </button>
          </Link>
        </div>
      </motion.div>

      {/* QUICK EDIT POPUP MODAL */}
      <AnimatePresence>
        {isEditingTask && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white dark:bg-[#27272A] w-full max-w-md p-6 rounded-t-[30px] sm:rounded-[30px] shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-bold text-[#2D3436] dark:text-white">Update Task</h3>
              <input 
                value={editForm.subject}
                onChange={(e) => setEditForm({...editForm, subject: e.target.value})}
                placeholder="Subject (e.g. Math)"
                className="w-full p-4 bg-gray-100 dark:bg-[#3F3F46] rounded-xl text-gray-900 dark:text-white outline-none"
              />
              <input 
                value={editForm.title}
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                placeholder="Task (e.g. Worksheet 3)"
                className="w-full p-4 bg-gray-100 dark:bg-[#3F3F46] rounded-xl text-gray-900 dark:text-white outline-none"
              />
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setIsEditingTask(false)}
                  className="flex-1 py-3 text-gray-400 font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveTaskEdit}
                  className="flex-1 py-3 bg-[#2D3436] dark:bg-emerald-600 text-white rounded-xl font-bold"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WIDGETS */}
      <div className="grid grid-cols-2 gap-4">
        
        {/* Widget 1: REAL Exam Pulse */}
        <Link href="/exam">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, ...springTransition }}
            className={`rounded-[25px] p-5 h-48 flex flex-col justify-between shadow-lg cursor-pointer hover:scale-105 transition-colors duration-500 ${getExamTheme()}`}
          >
            <div className="flex justify-between items-center opacity-80">
              <span className="font-semibold text-sm">Exam Pulse</span>
              {examData.prepLevel > 70 ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div>
              <h3 className="text-2xl font-bold leading-tight mb-1 truncate">{examData.subject}</h3>
              <p className="opacity-90 text-sm">{examData.daysLeft} Days Left</p>
            </div>
            <div className="w-full bg-black/10 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/90 transition-all duration-1000" 
                style={{ width: `${examData.prepLevel}%` }}
              ></div>
            </div>
          </motion.div>
        </Link>

        {/* Widget 2: Attendance Data */}
        <Link href="/attendance">
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, ...springTransition }}
            className="bg-[#FFDAC1] dark:bg-orange-900/40 dark:border dark:border-orange-500/20 rounded-[25px] p-5 h-48 flex flex-col justify-between shadow-lg cursor-pointer hover:scale-105 transition-colors"
          >
             <div className="flex justify-between items-center text-[#B07D62] dark:text-orange-300">
              <span className="font-semibold text-sm">Bunk Budget</span>
              <TrendingUp size={18} />
            </div>
            <div>
              <span className="text-[#B07D62] dark:text-orange-200 text-5xl font-bold block mb-1">{attendance.skipsLeft}</span>
              <p className="text-[#B07D62] dark:text-orange-300/80 font-bold leading-tight">Skips<br/>Available</p>
            </div>
            <div className={`px-3 py-1 rounded-lg self-start ${attendance.isSafe ? "bg-white/40 dark:bg-white/10" : "bg-red-500/20"}`}>
              <span className={`text-xs font-bold ${attendance.isSafe ? "text-[#9A634E] dark:text-orange-200" : "text-red-700 dark:text-red-400"}`}>
                {attendance.isSafe ? "Safe Zone" : "Danger!"}
              </span>
            </div>
          </motion.div>
        </Link>
      </div>

      {/* NEW: Exam Simulator Banner (Floating at bottom) */}
      <Link href="/simulator">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 w-full bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] p-5 rounded-[25px] flex items-center justify-between shadow-xl cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <PlayCircle size={28} />
            <div>
              <h3 className="font-bold text-lg">Mock Exam Mode</h3>
              <p className="text-sm opacity-70">Test yourself under pressure.</p>
            </div>
          </div>
          {/* THIS WAS THE CULPRIT: ArrowLeft is now imported! */}
          <ArrowLeft size={20} className="rotate-180" />
        </motion.div>
      </Link>
    </div>
  );
}