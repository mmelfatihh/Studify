"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, AlertTriangle, TrendingUp, Flame, LogOut, Settings } from "lucide-react";
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
  const [dashboardData, setDashboardData] = useState({
    activeTask: { subject: "No Task", title: "Set up your profile" },
    nextExam: { subject: "No Exams", daysLeft: "0" }
  });
  const [attendance, setAttendance] = useState({ skipsLeft: 0, isSafe: true });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      // 1. FETCH PROFILE (Name/Major)
      const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (profileSnap.exists()) {
        setProfile(profileSnap.data() as any);
      } else {
        // If no profile exists, redirect to setup!
        router.push("/setup");
      }

      // 2. FETCH DASHBOARD CARDS (Task/Exam)
      const dashSnap = await getDoc(doc(db, "users", currentUser.uid, "dashboard", "data"));
      if (dashSnap.exists()) {
        setDashboardData(dashSnap.data() as any);
      }

      // 3. FETCH REAL ATTENDANCE DATA
      const attSnap = await getDoc(doc(db, "users", currentUser.uid, "attendance", "stats"));
      if (attSnap.exists()) {
        const d = attSnap.data();
        // Calculate safe skips logic again
        const currentPct = (d.attended / d.total) * 100;
        const safeSkips = Math.floor((d.attended / (d.required / 100)) - d.total);
        setAttendance({
          skipsLeft: Math.max(0, safeSkips),
          isSafe: currentPct >= d.required
        });
      }

      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
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
           {/* Edit Profile Button */}
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

      {/* HERO: ACTIVE TASK (Now Real!) */}
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
            {/* We could add a time field to Setup later, keeping it static for now */}
            <span className="text-white/80 font-medium">Session 1</span>
          </div>

          <div>
            <h2 className="text-white text-3xl font-bold mb-2">{dashboardData.activeTask.subject}</h2>
            <p className="text-white/90 text-lg">{dashboardData.activeTask.title}</p>
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
        
        {/* Widget 1: REAL Exam Pulse */}
        <Link href="/exam">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, ...springTransition }}
            className="bg-[#FFB7B2] rounded-[25px] p-5 h-48 flex flex-col justify-between shadow-lg cursor-pointer hover:scale-105"
          >
            <div className="flex justify-between items-center text-white/80">
              <span className="font-semibold text-sm">Exam Pulse</span>
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-white text-2xl font-bold leading-tight mb-1">{dashboardData.nextExam.subject}</h3>
              <p className="text-white/70 text-sm">{dashboardData.nextExam.daysLeft} Days Left</p>
            </div>
            <div className="w-full bg-white/30 h-2 rounded-full overflow-hidden">
              <div className="h-full w-[40%] bg-white rounded-full"></div>
            </div>
          </motion.div>
        </Link>

        {/* Widget 2: REAL Attendance Data */}
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