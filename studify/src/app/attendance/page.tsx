"use client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ArrowLeft, AlertTriangle, CheckCircle, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/firebase"; // Connect to our tools

export default function AttendanceCalculator() {
  // --- STATE ---
  const [totalClasses, setTotalClasses] = useState(20);
  const [attendedClasses, setAttendedClasses] = useState(18);
  const [required, setRequired] = useState(70);
  
  const [loading, setLoading] = useState(true); // Is it loading from cloud?
  const [saving, setSaving] = useState(false);  // Is it saving to cloud?
  const [user, setUser] = useState<any>(null);  // Who is the user?

  // --- 1. LOAD DATA ON STARTUP ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Go get the data from Firestore: users -> [userID] -> attendance -> stats
        const docRef = doc(db, "users", currentUser.uid, "attendance", "stats");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // If data exists, update the sliders!
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

  // --- 2. SAVE DATA FUNCTION ---
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Save these specific numbers to this user's folder
      await setDoc(doc(db, "users", user.uid, "attendance", "stats"), {
        total: totalClasses,
        attended: attendedClasses,
        required: required
      });
      // Small delay just to show the user it worked
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

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7]">
      <Loader2 className="animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#FDFBF7] flex flex-col px-6 py-8 font-sans">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/">
          <button className="bg-gray-200 p-3 rounded-full text-gray-600 hover:bg-gray-300 transition-all">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <span className="text-gray-400 font-bold tracking-widest text-sm">ATTENDANCE</span>
      </div>

      <div className="flex justify-between items-end mb-6">
        <h1 className="text-[#2D3436] text-3xl font-bold">Bunk Budget</h1>
        {/* SAVE BUTTON */}
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#2D3436] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition-all active:scale-95"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* --- THE VERDICT CARD --- */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`rounded-[35px] p-8 shadow-xl mb-8 flex flex-col items-center justify-center text-center transition-colors duration-500 ${isSafe ? "bg-[#8FB996]" : "bg-[#ff6b6b]"}`}
      >
        {/* DONUT CHART */}
        <div className="relative h-48 w-48 mb-4">
          <svg className="h-full w-full transform -rotate-90">
            <circle cx="96" cy="96" r={radius} stroke="rgba(255,255,255,0.2)" strokeWidth="12" fill="transparent"/>
            <motion.circle
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
              cx="96" cy="96" r={radius}
              stroke="white" strokeWidth="12" fill="transparent"
              strokeDasharray={circumference}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <span className="text-4xl font-bold">{currentPercentage}%</span>
            <span className="text-xs opacity-80 uppercase font-bold mt-1">Attendance</span>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-3">
          {isSafe ? <CheckCircle className="text-white" /> : <AlertTriangle className="text-white" />}
          <div className="text-left">
            <p className="text-white text-xs font-bold uppercase opacity-80">Verdict</p>
            <p className="text-white font-bold leading-none">
              {isSafe ? `Safe! You can skip ${Math.max(0, safeSkips)} more.` : "DANGER! Go to class!"}
            </p>
          </div>
        </div>
      </motion.div>


      {/* --- INPUTS --- */}
      <div className="bg-white rounded-[30px] p-6 shadow-sm space-y-6">
        
        {/* Input 1: Attended */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-gray-500 font-bold text-sm">Classes Attended</label>
            <span className="text-[#2D3436] font-bold">{attendedClasses}</span>
          </div>
          <input 
            type="range" min="0" max={totalClasses} value={attendedClasses}
            onChange={(e) => setAttendedClasses(parseInt(e.target.value))}
            className="w-full h-3 bg-gray-100 rounded-full appearance-none accent-[#2D3436]"
          />
        </div>

        {/* Input 2: Total Classes */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-gray-500 font-bold text-sm">Total Classes Held</label>
            <span className="text-[#2D3436] font-bold">{totalClasses}</span>
          </div>
          <input 
            type="range" min="1" max="50" value={totalClasses}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setTotalClasses(val);
              if (attendedClasses > val) setAttendedClasses(val);
            }}
            className="w-full h-3 bg-gray-100 rounded-full appearance-none accent-[#2D3436]"
          />
        </div>

         {/* Input 3: Requirement */}
         <div className="pt-4 border-t border-gray-100">
            <label className="text-gray-400 font-bold text-xs uppercase mb-2 block">Minimum Requirement (%)</label>
            <div className="flex gap-2">
              {[70, 75, 80, 85].map((pct) => (
                <button 
                  key={pct}
                  onClick={() => setRequired(pct)}
                  className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${required === pct ? "bg-[#2D3436] text-white" : "bg-gray-100 text-gray-400"}`}
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