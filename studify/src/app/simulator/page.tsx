"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, ShieldCheck } from "lucide-react";
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
      alert("Pencils Down! 📝");
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft]);

  const startExam = () => {
    setTimeLeft(duration * 60);
    setIsPlaying(true);
    // Request full screen if possible (browser dependent)
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err));
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-1000 ${isPlaying ? 'bg-white dark:bg-black' : 'bg-[#FDFBF7] dark:bg-[#18181B]'}`}>
      
      {/* HEADER (Hidden during exam) */}
      {!isPlaying && (
        <div className="px-6 py-8 flex justify-between items-center">
          <Link href="/">
            <button className="bg-white dark:bg-[#27272A] p-3 rounded-full shadow-sm text-gray-600 dark:text-gray-200">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <span className="text-[#2D3436] dark:text-white font-bold tracking-widest opacity-80">SIMULATOR</span>
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
            <ShieldCheck size={48} className="mx-auto text-[#2D3436] dark:text-white mb-4" />
            <h1 className="text-3xl font-bold text-[#2D3436] dark:text-white">Exam Conditions</h1>
            <p className="text-gray-400">No phones. No pausing. Just you.</p>
          </div>

          <div className="bg-white dark:bg-[#27272A] p-8 rounded-[40px] shadow-xl space-y-6">
            <h3 className="text-center font-bold text-xl text-[#2D3436] dark:text-white">{examSubject}</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Duration</label>
              <div className="flex justify-between items-center bg-gray-50 dark:bg-[#3F3F46] p-4 rounded-2xl">
                <button onClick={() => setDuration(Math.max(15, duration - 15))} className="p-2 text-2xl font-bold text-gray-400">-</button>
                <span className="text-2xl font-bold text-[#2D3436] dark:text-white">{duration} min</span>
                <button onClick={() => setDuration(duration + 15)} className="p-2 text-2xl font-bold text-[#2D3436] dark:text-white">+</button>
              </div>
            </div>
          </div>

          <button 
            onClick={startExam}
            className="w-full bg-[#2D3436] dark:bg-white text-white dark:text-black font-bold py-5 rounded-[25px] shadow-lg hover:scale-[1.02] transition-all"
          >
            Start Proctor
          </button>
        </motion.div>
      ) : (
        /* EXAM MODE (The Clock) */
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center relative"
        >
          {/* THE CLOCK UI */}
          <div className="w-64 h-64 rounded-full border-8 border-[#2D3436] dark:border-white flex items-center justify-center shadow-2xl bg-white dark:bg-black">
            <span className="text-5xl font-mono font-bold text-[#2D3436] dark:text-white tracking-widest">
              {formatTime(timeLeft)}
            </span>
          </div>

          <div className="mt-12 text-center space-y-2 animate-pulse">
            <AlertTriangle className="mx-auto text-red-500" />
            <p className="text-red-500 font-bold uppercase tracking-widest text-sm">Exam in Progress</p>
            <p className="text-gray-400 text-xs">Do not leave this screen.</p>
          </div>

          {/* Emergency Exit */}
          <button 
            onClick={() => setIsPlaying(false)}
            className="absolute bottom-10 text-gray-300 text-xs font-bold hover:text-red-500 transition-colors"
          >
            I GIVE UP (END EXAM)
          </button>
        </motion.div>
      )}
    </div>
  );
}