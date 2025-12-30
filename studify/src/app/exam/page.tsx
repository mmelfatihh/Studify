"use client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ArrowLeft, AlertCircle, CheckCircle, Edit3, Calendar } from "lucide-react";
import Link from "next/link";

export default function ExamPulse() {
  const [prepLevel, setPrepLevel] = useState(50);
  const [subject, setSubject] = useState("Chemistry"); 
  const [examDate, setExamDate] = useState("");
  const [daysLeft, setDaysLeft] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedPrep = localStorage.getItem("examPrep");
    const savedSubject = localStorage.getItem("examSubject");
    const savedDate = localStorage.getItem("examDate");

    if (savedPrep) setPrepLevel(parseInt(savedPrep));
    if (savedSubject) setSubject(savedSubject);
    
    if (savedDate) {
      setExamDate(savedDate);
      const diff = new Date(savedDate).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      setDaysLeft(days > 0 ? days : 0);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem("examPrep", prepLevel.toString());
      localStorage.setItem("examSubject", subject);
      localStorage.setItem("examDate", examDate);
    }
  }, [prepLevel, subject, examDate, isClient]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setExamDate(newDate);
    
    const diff = new Date(newDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    setDaysLeft(days > 0 ? days : 0);
  };

  // BACKGROUND LOGIC
  const getBgColor = () => {
    // Light Mode: Colored Backgrounds
    // Dark Mode: Warm Stone Background
    if (prepLevel < 30) return "bg-[#ff6b6b] dark:bg-[#1C1917]";
    if (prepLevel < 70) return "bg-[#feca57] dark:bg-[#1C1917]";
    return "bg-[#1dd1a1] dark:bg-[#1C1917]";
  };

  // METER LOGIC
  const getMeterColor = () => {
    if (prepLevel < 30) return "bg-[#ff6b6b]"; 
    if (prepLevel < 70) return "bg-[#feca57]"; 
    return "bg-[#1dd1a1]"; 
  };

  const getMessage = () => {
    if (prepLevel < 30) return "Panic Mode";
    if (prepLevel < 70) return "Push Harder";
    return "You're Ready";
  };

  if (!isClient) return null;

  return (
    <div className={`min-h-screen w-full flex flex-col px-6 py-8 transition-colors duration-1000 ease-in-out ${getBgColor()}`}>
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/">
          <button className="bg-white/20 dark:bg-[#292524] p-3 rounded-full backdrop-blur-md text-white dark:text-gray-300 hover:bg-white/40 transition-all">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <span className="text-white dark:text-gray-500 font-bold tracking-widest opacity-80">EXAM PULSE</span>
      </div>

      {/* MAIN CARD */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        // FIX: Added dark:bg-[#292524] for the Warm Espresso look
        className="bg-white dark:bg-[#292524] rounded-[40px] p-8 shadow-2xl flex flex-col items-center text-center space-y-6 transition-colors duration-500"
      >
        
        {/* EDITABLE TITLE */}
        <div className="w-full space-y-4">
          <div className="relative group">
            <input 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              // FIX: Added dark:text-white and dark:focus:border-white
              className="text-gray-800 dark:text-white text-3xl font-bold text-center w-full bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-gray-800 dark:focus:border-white focus:outline-none transition-all placeholder-gray-300"
              placeholder="Enter Subject"
            />
            <Edit3 className="absolute top-2 right-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
          </div>
          
          <div className="flex flex-col items-center gap-2">
            {/* FIX: Dark mode borders and backgrounds for date picker */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#44403C] px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors">
              <Calendar size={18} className="text-gray-400" />
              <input 
                type="date"
                value={examDate}
                onChange={handleDateChange}
                className="bg-transparent text-gray-600 dark:text-gray-200 font-medium outline-none text-sm uppercase tracking-wide"
              />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {daysLeft} Days Remaining
            </span>
          </div>
        </div>

        {/* VISUAL METER */}
        {/* FIX: Dark mode background is now black for better contrast */}
        <div className="relative w-full h-64 bg-gray-100 dark:bg-black rounded-[30px] flex items-end justify-center overflow-hidden border-4 border-white dark:border-[#44403C] shadow-inner transition-colors">
          <motion.div 
            animate={{ height: `${prepLevel}%` }}
            transition={{ type: "spring", bounce: 0, duration: 0.8 }}
            className={`w-full transition-colors duration-500 ${getMeterColor()}`}
          />
          
          {/* READABILITY FIX: Added a pill background behind the text */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/40 dark:bg-black/40 backdrop-blur-sm px-6 py-2 rounded-2xl shadow-sm z-10">
            <h2 className="text-5xl font-bold text-[#2D3436] dark:text-white">
              {prepLevel}%
            </h2>
          </div>
        </div>

        {/* STATUS MESSAGE */}
        <div className="flex items-center gap-2">
          {prepLevel > 70 ? <CheckCircle className="text-green-500" /> : <AlertCircle className="text-orange-500" />}
          {/* FIX: Text color for dark mode */}
          <span className="text-gray-600 dark:text-gray-300 font-bold text-lg">{getMessage()}</span>
        </div>

        {/* THE SLIDER */}
        <div className="w-full">
          <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">
            Adjust Preparation Level
          </label>
          {/* FIX: Accent color for dark mode */}
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={prepLevel} 
            onChange={(e) => setPrepLevel(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-[#44403C] rounded-lg appearance-none cursor-pointer accent-gray-800 dark:accent-white"
          />
        </div>

      </motion.div>
    </div>
  );
}