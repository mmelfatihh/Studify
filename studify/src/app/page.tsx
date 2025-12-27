"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, AlertTriangle, TrendingUp, CheckCircle, Settings, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- DYNAMIC DATA STATE ---
  const [profile, setProfile] = useState({ name: "Student", major: "General" });
  
  // 1. Task comes from Database (Synced across devices)
  const [activeTask, setActiveTask] = useState({ subject: "No Task", title: "Set up your profile" });
  
  // 2. Exam comes from Local Storage (Your personal widget)
  const [examData, setExamData] = useState({ 
    subject: "Set Goal", 
    daysLeft: 0, 
    prepLevel: 50 
  });

  const [attendance, setAttendance] = useState({ skipsLeft: 0, isSafe: true });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      // A. FETCH PROFILE & ACTIVE TASK (Firebase)
      const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (profileSnap.exists()) {
        setProfile(profileSnap.data() as any);
      } else {
        router.push("/setup");
      }

      const dashSnap = await getDoc(doc(db, "users", currentUser.uid, "dashboard", "data"));
      if (dashSnap.exists()) {
        const data = dashSnap.data();
        if (data.activeTask) setActiveTask(data.activeTask);
      }

      // B. FETCH ATTENDANCE (Firebase)
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

      // C. FETCH EXAM DATA (Local Storage - The Fix!)
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

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // Helper to get the color for the Dashboard Widget
  const getExamTheme = () => {
    const level = examData.prepLevel;
    if (level < 30) return "bg-[#ff6b6b] text-white"; // Red
    if (level < 70) return "bg-[#feca57] text-[#2D3436]"; // Orange
    return "bg-[#1dd1a1] text-white"; // Green
  };

  if (loading) return <div className="min-h-screen bg-[#FDFBF7]" />;

  const springTransition = { type: "spring", stiffness: 200, damping: 20 };

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFBF7] text-[#2D3436] px-6 pt-12 pb-6 font-sans">
      
      {/* HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-[#4A4E69]">Hi, {profile.name}</h1>
          <p className="text-[#9A8C98] font-medium text-sm">{profile.major}</p>
        </div>
        
        <div className="flex items-center gap-3">
           <Link href="/setup">
            <button className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-300">
              <Settings size={18} />
            </button>
          </Link>
          
          <button onClick={handleLogout} className="h-10 w-10 rounded-full bg-[#C9ADA7] border-2 border-white shadow-sm flex items-center justify-center hover:bg-red-400 group">
            <LogOut size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </motion.div>

      {/* HERO: ACTIVE TASK */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springTransition}
        className="relative w-full h-80 mb-8"
      >
        <div className="absolute top-4 left-0 w-full h-full bg-[#E8E8E4] rounded-[30px] shadow-sm transform scale-95 opacity-60 z-0"></div>

        <Link href="/schedule">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="absolute top-0 left-0 w-full h-full bg-[#8FB996] rounded-[30px] shadow-2xl p-6 flex flex-col justify-between z-10"
        >
          <div className="flex justify-between items-start">
            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl">
              <span className="text-white font-bold text-sm">Now Active</span>
            </div>
            <span className="text-white/80 font-medium">Session 1</span>
          </div>

          <div>
            <h2 className="text-white text-3xl font-bold mb-2">{activeTask.subject}</h2>
            <p className="text-white/90 text-lg">{activeTask.title}</p>
          </div>

          <Link href="/focus" className="w-full">
            <button className="w-full bg-white text-[#5F8D6B] font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-[#F0F7F4] transition-colors">
              <BookOpen size={20} />
              Enter Focus Room
            </button>
          </Link>
        </motion.div>
        </Link>
      </motion.div>

      {/* WIDGETS */}
      <div className="grid grid-cols-2 gap-4">
        
        {/* Widget 1: REAL Exam Pulse (Now Smart!) */}
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
            {/* Progress Bar */}
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
            className="bg-[#FFDAC1] rounded-[25px] p-5 h-48 flex flex-col justify-between shadow-lg cursor-pointer hover:scale-105"
          >
             <div className="flex justify-between items-center text-[#B07D62]">
              <span className="font-semibold text-sm">Bunk Budget</span>
              <TrendingUp size={18} />
            </div>
            <div>
              <span className="text-[#B07D62] text-5xl font-bold block mb-1">{attendance.skipsLeft}</span>
              <p className="text-[#B07D62] font-bold leading-tight">Skips<br/>Available</p>
            </div>
            <div className={`px-3 py-1 rounded-lg self-start ${attendance.isSafe ? "bg-white/40" : "bg-red-500/20"}`}>
              <span className={`text-xs font-bold ${attendance.isSafe ? "text-[#9A634E]" : "text-red-700"}`}>
                {attendance.isSafe ? "Safe Zone" : "Danger!"}
              </span>
            </div>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}