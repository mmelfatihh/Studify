"use client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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

  // --- COLOR LOGIC (Warm Stone Edition) ---
  const getExamTheme = () => {
    const level = examData.prepLevel;
    // Light: Solid Colors
    // Dark: Espresso Card (#292524) + Colored Border + Pastel Text
    if (level < 30) return "bg-[#ff6b6b] text-white dark:bg-[#292524] dark:text-red-200 dark:border-2 dark:border-red-400/20"; 
    if (level < 70) return "bg-[#feca57] text-[#2D3436] dark:bg-[#292524] dark:text-orange-200 dark:border-2 dark:border-orange-400/20"; 
    return "bg-[#1dd1a1] text-white dark:bg-[#292524] dark:text-emerald-200 dark:border-2 dark:border-emerald-400/20"; 
  };

  if (loading) return <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#1C1917]" />;

  const springTransition = { type: "spring", stiffness: 200, damping: 20 };

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFBF7] dark:bg-[#1C1917] text-[#2D3436] dark:text-[#E7E5E4] px-6 pt-12 pb-6 font-sans transition-colors duration-500">
      
      {/* HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-[#4A4E69] dark:text-[#E7E5E4]">Hi, {profile.name}</h1>
          <p className="text-[#9A8C98] dark:text-gray-500 font-medium text-sm">{profile.major}</p>
        </div>
        
        <div className="flex items-center gap-3">
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

      {/* HERO: ACTIVE TASK */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springTransition}
        className="relative w-full h-80 mb-8"
      >
        {/* Shadow Layer */}
        <div className="absolute top-4 left-0 w-full h-full bg-[#E8E8E4] dark:bg-black/40 rounded-[30px] shadow-sm transform scale-95 opacity-60 z-0 transition-colors"></div>

        {/* Main Card */}
        <div className="absolute top-0 left-0 w-full h-full 
          bg-[#8FB996] text-white
          dark:bg-[#292524] dark:text-emerald-100 dark:border-2 dark:border-emerald-500/20
          rounded-[30px] shadow-2xl p-6 flex flex-col justify-between z-10 transition-all duration-500 backdrop-blur-sm"
        >
          <div className="flex justify-between items-start">
            <div className="bg-white/20 dark:bg-emerald-500/10 backdrop-blur-md px-4 py-2 rounded-2xl">
              <span className="font-bold text-sm dark:text-emerald-200">Now Active</span>
            </div>
            <button 
              onClick={() => {
                setEditForm({ subject: activeTask.subject, title: activeTask.title });
                setIsEditingTask(true);
              }}
              className="p-2 bg-white/10 dark:bg-emerald-500/10 rounded-full hover:bg-white/30 dark:hover:bg-emerald-500/20 transition-colors"
            >
              <Edit2 size={16} className="dark:text-emerald-200" />
            </button>
          </div>

          <Link href="/schedule" className="block group">
            <h2 className="text-3xl font-bold mb-2 group-hover:scale-105 transition-transform origin-left dark:text-emerald-200">{activeTask.subject}</h2>
            <p className="opacity-90 text-lg dark:text-gray-400">{activeTask.title}</p>
          </Link>

          <Link href="/focus" className="w-full">
            <button className="w-full bg-white dark:bg-[#44403C] text-[#5F8D6B] dark:text-emerald-200 font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-[#F0F7F4] dark:hover:bg-[#57534E] transition-colors">
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
              className="bg-white dark:bg-[#292524] w-full max-w-md p-6 rounded-t-[30px] sm:rounded-[30px] shadow-2xl space-y-4 border dark:border-[#44403C]"
            >
              <h3 className="text-lg font-bold text-[#2D3436] dark:text-[#E7E5E4]">Update Task</h3>
              <input 
                value={editForm.subject}
                onChange={(e) => setEditForm({...editForm, subject: e.target.value})}
                placeholder="Subject (e.g. Math)"
                className="w-full p-4 bg-gray-100 dark:bg-[#1C1917] rounded-xl text-gray-900 dark:text-[#E7E5E4] outline-none border border-transparent focus:border-emerald-500"
              />
              <input 
                value={editForm.title}
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                placeholder="Task (e.g. Worksheet 3)"
                className="w-full p-4 bg-gray-100 dark:bg-[#1C1917] rounded-xl text-gray-900 dark:text-[#E7E5E4] outline-none border border-transparent focus:border-emerald-500"
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
                  className="flex-1 py-3 bg-[#2D3436] dark:bg-emerald-700 text-white rounded-xl font-bold"
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
            {/* Progress Bar: Darker track in dark mode */}
            <div className="w-full bg-black/10 dark:bg-black/40 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/90 dark:bg-current transition-all duration-1000" 
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
            className="
              bg-[#FFDAC1] text-[#B07D62]
              dark:bg-[#292524] dark:text-orange-200 dark:border-2 dark:border-orange-400/20
              rounded-[25px] p-5 h-48 flex flex-col justify-between shadow-lg cursor-pointer hover:scale-105 transition-colors"
          >
             <div className="flex justify-between items-center">
              <span className="font-semibold text-sm">Bunk Budget</span>
              <TrendingUp size={18} />
            </div>
            <div>
              <span className="text-5xl font-bold block mb-1">{attendance.skipsLeft}</span>
              <p className="font-bold leading-tight opacity-80">Skips<br/>Available</p>
            </div>
            <div className={`px-3 py-1 rounded-lg self-start ${attendance.isSafe ? "bg-white/40 dark:bg-orange-500/10" : "bg-red-500/20"}`}>
              <span className={`text-xs font-bold ${attendance.isSafe ? "text-current" : "text-red-700 dark:text-red-400"}`}>
                {attendance.isSafe ? "Safe Zone" : "Danger!"}
              </span>
            </div>
          </motion.div>
        </Link>
      </div>

      {/* SIMULATOR BANNER */}
      <Link href="/simulator">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 w-full bg-[#2D3436] dark:bg-[#292524] dark:border dark:border-[#44403C] text-white dark:text-[#E7E5E4] p-5 rounded-[25px] flex items-center justify-between shadow-xl cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <PlayCircle size={28} className="dark:text-gray-400" />
            <div>
              <h3 className="font-bold text-lg">Mock Exam Mode</h3>
              <p className="text-sm opacity-70 dark:text-gray-500">Test yourself under pressure.</p>
            </div>
          </div>
          <ArrowLeft size={20} className="rotate-180 dark:text-gray-500" />
        </motion.div>
      </Link>
    </div>
  );
}