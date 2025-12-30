"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, AlertTriangle, ShieldCheck, Flag, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Simulator() {
  const router = useRouter();
  const [examSubject, setExamSubject] = useState("Mock Exam");
  
  // States
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [duration, setDuration] = useState(60); // default 60 mins
  
  useEffect(() => {
    const saved = localStorage.getItem("examSubject");
    if (saved) setExamSubject(saved);
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      alert("Time's Up! Pencils Down. 📝");
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft]);

  const startExam = () => {
    setTimeLeft(duration * 60);
    setIsPlaying(true);
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err));
    }
  };

  const handleFinishEarly = () => {
    setIsPlaying(false);
    // Logic to save "Success" goes here
    alert("Exam Submitted! Great job.");
  };

  const handleGiveUp = () => {
    setIsPlaying(false);
    // Logic to save "Failed" goes here
  };

  // Helper for formatting mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return { 
      min: m.toString().padStart(2, '0'), 
      sec: s.toString().padStart(2, '0') 
    };
  };

  // --- SVG RING LOGIC ---
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const progress = isPlaying ? (timeLeft / (duration * 60)) : 1;
  const strokeDashoffset = circumference - (progress * circumference);

  const timeObj = formatTime(timeLeft);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-1000 ${isPlaying ? 'bg-[#FDFBF7] dark:bg-[#1C1917]' : 'bg-[#FDFBF7] dark:bg-[#1C1917]'}`}>
      
      {/* HEADER (Hidden during exam) */}
      {!isPlaying && (
        <div className="px-6 py-8 flex justify-between items-center">
          <Link href="/">
            <button className="bg-white dark:bg-[#292524] p-3 rounded-full shadow-sm text-gray-600 dark:text-gray-300 hover:scale-105 transition-all">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <span className="text-[#2D3436] dark:text-gray-400 font-bold tracking-widest opacity-80">SIMULATOR</span>
        </div>
      )}

      {/* SETUP SCREEN */}
      {!isPlaying ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col justify-center px-6 space-y-8"
        >
          <div className="text-center space-y-2">
            <ShieldCheck size={48} className="mx-auto text-[#2D3436] dark:text-[#E7E5E4] mb-4" />
            <h1 className="text-3xl font-bold text-[#2D3436] dark:text-[#E7E5E4]">Exam Conditions</h1>
            <p className="text-gray-400">No phones. No pausing. Just you.</p>
          </div>

          <div className="bg-white dark:bg-[#292524] p-8 rounded-[40px] shadow-xl space-y-6 transition-colors">
            <h3 className="text-center font-bold text-xl text-[#2D3436] dark:text-white">{examSubject}</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Duration</label>
              <div className="flex justify-between items-center bg-gray-50 dark:bg-[#44403C] p-4 rounded-2xl transition-colors">
                <button onClick={() => setDuration(Math.max(15, duration - 15))} className="p-2 text-2xl font-bold text-gray-400 hover:text-gray-600">-</button>
                <span className="text-2xl font-bold text-[#2D3436] dark:text-white">{duration} min</span>
                <button onClick={() => setDuration(duration + 15)} className="p-2 text-2xl font-bold text-[#2D3436] dark:text-white hover:opacity-70">+</button>
              </div>
            </div>
          </div>

          <button 
            onClick={startExam}
            className="w-full bg-[#2D3436] dark:bg-[#E7E5E4] text-white dark:text-[#1C1917] font-bold py-5 rounded-[25px] shadow-lg hover:scale-[1.02] transition-all"
          >
            Start Proctor
          </button>
        </motion.div>
      ) : (
        /* --- EXAM MODE --- */
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center relative p-6"
        >
          {/* 1. THE CLOCK RING */}
          <div className="relative w-72 h-72 flex items-center justify-center mb-12">
            {/* SVG Ring */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="144" cy="144" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-200 dark:text-[#292524]" />
              <motion.circle 
                cx="144" cy="144" r="120" 
                stroke="currentColor" 
                strokeWidth="8" 
                fill="transparent"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "linear" }}
                className="text-[#2D3436] dark:text-[#E7E5E4]"
                strokeLinecap="round"
              />
            </svg>

            {/* 2. THE SLIDING NUMBERS */}
            <div className="flex items-center text-6xl font-mono font-bold text-[#2D3436] dark:text-[#E7E5E4] z-10">
              {/* Minutes */}
              <div className="relative overflow-hidden h-20 w-24 flex justify-center">
                <AnimatePresence mode="popLayout">
                  <motion.span 
                    key={timeObj.min}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    {timeObj.min}
                  </motion.span>
                </AnimatePresence>
              </div>
              <span className="pb-2">:</span>
              {/* Seconds */}
              <div className="relative overflow-hidden h-20 w-24 flex justify-center">
                 <AnimatePresence mode="popLayout">
                  <motion.span 
                    key={timeObj.sec}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    {timeObj.sec}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* 3. THE INTENTION CARDS */}
          <div className="w-full max-w-sm grid grid-cols-2 gap-4">
            
            {/* Card A: Finished Early */}
            <button 
              onClick={handleFinishEarly}
              className="bg-white dark:bg-[#292524] p-6 rounded-[30px] border-2 border-transparent hover:border-[#8FB996] dark:hover:border-emerald-500/50 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="bg-[#E8F5E9] dark:bg-emerald-900/30 p-3 rounded-full text-[#8FB996] dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={24} />
              </div>
              <span className="text-sm font-bold text-gray-500 dark:text-gray-300 group-hover:text-[#2D3436] dark:group-hover:text-white">Finished Early</span>
            </button>

            {/* Card B: I Give Up */}
            <button 
              onClick={handleGiveUp}
              className="bg-white dark:bg-[#292524] p-6 rounded-[30px] border-2 border-transparent hover:border-[#FFB7B2] dark:hover:border-red-500/50 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="bg-[#FFEBEE] dark:bg-red-900/30 p-3 rounded-full text-[#FFB7B2] dark:text-red-400 group-hover:scale-110 transition-transform">
                <Flag size={24} />
              </div>
              <span className="text-sm font-bold text-gray-500 dark:text-gray-300 group-hover:text-[#2D3436] dark:group-hover:text-white">I Give Up</span>
            </button>

          </div>
        </motion.div>
      )}
    </div>
  );
}