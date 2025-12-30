"use client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ArrowLeft, AlertTriangle, CheckCircle, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase";

export default function AttendanceCalculator() {
  // --- STATE ---
  const [totalClasses, setTotalClasses] = useState(20);
  const [attendedClasses, setAttendedClasses] = useState(18);
  const [required, setRequired] = useState(70);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  // --- 1. LOAD DATA ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const docRef = doc(db, "users", currentUser.uid, "attendance", "stats");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setTotalClasses(data.total);
          setAttendedClasses(data.attended);
          setRequired(data.required);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. SAVE DATA ---
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid, "attendance", "stats"), {
        total: totalClasses,
        attended: attendedClasses,
        required: required
      });
      setTimeout(() => setSaving(false), 500);
    } catch (e) {
      console.error("Error saving:", e);
      setSaving(false);
    }
  };

  // --- LOGIC ---
  const currentPercentage = Math.round((attendedClasses / totalClasses) * 100) || 0;
  const safeSkips = Math.floor((attendedClasses / (required / 100)) - totalClasses);
  const isSafe = currentPercentage >= required;

  // Visual Circle Logic
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (currentPercentage / 100) * circumference;

  // --- THEME HELPERS ---
  const getCardStyle = () => {
    // Light Mode: Solid Colors
    // Dark Mode: Dark Card + Border
    if (isSafe) return "bg-[#8FB996] text-white dark:bg-[#292524] dark:border-2 dark:border-emerald-500/30 dark:text-emerald-100";
    return "bg-[#ff6b6b] text-white dark:bg-[#292524] dark:border-2 dark:border-red-500/30 dark:text-red-100";
  };

  const getRingColor = () => {
      if (isSafe) return "stroke-white dark:stroke-emerald-400";
      return "stroke-white dark:stroke-red-400";
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7] dark:bg-[#1C1917]">
      <Loader2 className="animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#FDFBF7] dark:bg-[#1C1917] flex flex-col px-6 py-8 font-sans transition-colors duration-500">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/">
          <button className="bg-gray-200 dark:bg-[#292524] p-3 rounded-full text-gray-600 dark:text-gray-300 hover:scale-105 transition-all">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <span className="text-gray-400 dark:text-gray-500 font-bold tracking-widest text-sm">ATTENDANCE</span>
      </div>

      <div className="flex justify-between items-end mb-6">
        <h1 className="text-[#2D3436] dark:text-[#E7E5E4] text-3xl font-bold">Bunk Budget</h1>
        {/* SAVE BUTTON */}
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] px-4 py-2 rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-gray-200 transition-all active:scale-95"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* --- THE VERDICT CARD --- */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`rounded-[35px] p-8 shadow-xl mb-8 flex flex-col items-center justify-center text-center transition-colors duration-500 ${getCardStyle()}`}
      >
        {/* DONUT CHART */}
        <div className="relative h-48 w-48 mb-4">
          <svg className="h-full w-full transform -rotate-90">
            {/* Background Ring */}
            <circle cx="96" cy="96" r={radius} className="stroke-white/20 dark:stroke-gray-700" strokeWidth="12" fill="transparent"/>
            {/* Active Ring */}
            <motion.circle
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
              cx="96" cy="96" r={radius}
              className={getRingColor()}
              strokeWidth="12" fill="transparent"
              strokeDasharray={circumference}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-current">{currentPercentage}%</span>
            <span className="text-xs opacity-80 uppercase font-bold mt-1 text-current">Attendance</span>
          </div>
        </div>

        <div className="bg-white/20 dark:bg-black/20 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-3">
          {isSafe ? <CheckCircle className="text-current" /> : <AlertTriangle className="text-current" />}
          <div className="text-left">
            <p className="text-current text-xs font-bold uppercase opacity-80">Verdict</p>
            <p className="text-current font-bold leading-none">
              {isSafe ? `Safe! You can skip ${Math.max(0, safeSkips)} more.` : "DANGER! Go to class!"}
            </p>
          </div>
        </div>
      </motion.div>


      {/* --- INPUTS --- */}
      <div className="bg-white dark:bg-[#292524] rounded-[30px] p-6 shadow-sm space-y-6 transition-colors duration-500">
        
        {/* Input 1: Attended */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-gray-500 dark:text-gray-400 font-bold text-sm">Classes Attended</label>
            <span className="text-[#2D3436] dark:text-white font-bold">{attendedClasses}</span>
          </div>
          <input 
            type="range" min="0" max={totalClasses} value={attendedClasses}
            onChange={(e) => setAttendedClasses(parseInt(e.target.value))}
            className="w-full h-3 bg-gray-100 dark:bg-[#44403C] rounded-full appearance-none accent-[#2D3436] dark:accent-white"
          />
        </div>

        {/* Input 2: Total Classes */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-gray-500 dark:text-gray-400 font-bold text-sm">Total Classes Held</label>
            <span className="text-[#2D3436] dark:text-white font-bold">{totalClasses}</span>
          </div>
          <input 
            type="range" min="1" max="50" value={totalClasses}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setTotalClasses(val);
              if (attendedClasses > val) setAttendedClasses(val);
            }}
            className="w-full h-3 bg-gray-100 dark:bg-[#44403C] rounded-full appearance-none accent-[#2D3436] dark:accent-white"
          />
        </div>

         {/* Input 3: Requirement */}
         <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <label className="text-gray-400 font-bold text-xs uppercase mb-2 block">Minimum Requirement (%)</label>
            <div className="flex gap-2">
              {[70, 75, 80, 85].map((pct) => (
                <button 
                  key={pct}
                  onClick={() => setRequired(pct)}
                  className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${required === pct ? "bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436]" : "bg-gray-100 dark:bg-[#44403C] text-gray-400 dark:text-gray-300"}`}
                >
                  {pct}%
                </button>
              ))}
            </div>
         </div>
      </div>
    </div>
  );
}