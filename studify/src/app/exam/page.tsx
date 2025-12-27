"use client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ArrowLeft, AlertCircle, CheckCircle, Edit3, Calendar } from "lucide-react";
import Link from "next/link";

export default function ExamPulse() {
  const [prepLevel, setPrepLevel] = useState(50);
  const [subject, setSubject] = useState("Chemistry"); 
  const [examDate, setExamDate] = useState(""); // We store the actual DATE now
  const [daysLeft, setDaysLeft] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // 1. Load data
  useEffect(() => {
    setIsClient(true);
    const savedPrep = localStorage.getItem("examPrep");
    const savedSubject = localStorage.getItem("examSubject");
    const savedDate = localStorage.getItem("examDate");

    if (savedPrep) setPrepLevel(parseInt(savedPrep));
    if (savedSubject) setSubject(savedSubject);
    
    // Calculate days remaining if a date exists
    if (savedDate) {
      setExamDate(savedDate);
      const diff = new Date(savedDate).getTime() - new Date().getTime();
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      setDaysLeft(days > 0 ? days : 0);
    }
  }, []);

  // 2. Save data automatically
  useEffect(() => {
    if (isClient) {
      localStorage.setItem("examPrep", prepLevel.toString());
      localStorage.setItem("examSubject", subject);
      localStorage.setItem("examDate", examDate);
    }
  }, [prepLevel, subject, examDate, isClient]);

  // Update days left whenever date changes
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setExamDate(newDate);
    
    const diff = new Date(newDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    setDaysLeft(days > 0 ? days : 0);
  };

  const getColor = () => {
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
    <div className={`min-h-screen w-full flex flex-col px-6 py-8 transition-colors duration-1000 ease-in-out ${getColor()}`}>
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/">
          <button className="bg-white/20 p-3 rounded-full backdrop-blur-md text-white hover:bg-white/40 transition-all">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <span className="text-white font-bold tracking-widest opacity-80">EXAM PULSE</span>
      </div>

      {/* MAIN CARD */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-[40px] p-8 shadow-2xl flex flex-col items-center text-center space-y-6"
      >
        
        {/* EDITABLE TITLE & DATE PICKER */}
        <div className="w-full space-y-4">
          <div className="relative group">
            <input 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-gray-800 text-3xl font-bold text-center w-full bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-gray-800 focus:outline-none transition-all placeholder-gray-300"
              placeholder="Enter Subject"
            />
            <Edit3 className="absolute top-2 right-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
              <Calendar size={18} className="text-gray-400" />
              {/* This is the new Date Picker */}
              <input 
                type="date"
                value={examDate}
                onChange={handleDateChange}
                className="bg-transparent text-gray-600 font-medium outline-none text-sm uppercase tracking-wide"
              />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {daysLeft} Days Remaining
            </span>
          </div>
        </div>

        {/* VISUAL METER */}
        <div className="relative w-full h-64 bg-gray-100 rounded-[30px] flex items-end justify-center overflow-hidden border-4 border-white shadow-inner">
          <motion.div 
            animate={{ height: `${prepLevel}%` }}
            transition={{ type: "spring", bounce: 0, duration: 0.8 }}
            className={`w-full transition-colors duration-500 ${getColor()}`}
          />
          <h2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-5xl font-bold text-gray-800/50 mix-blend-overlay">
            {prepLevel}%
          </h2>
        </div>

        {/* STATUS MESSAGE */}
        <div className="flex items-center gap-2">
          {prepLevel > 70 ? <CheckCircle className="text-green-500" /> : <AlertCircle className="text-orange-500" />}
          <span className="text-gray-600 font-bold text-lg">{getMessage()}</span>
        </div>

        {/* THE SLIDER */}
        <div className="w-full">
          <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">
            Adjust Preparation Level
          </label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={prepLevel} 
            onChange={(e) => setPrepLevel(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
          />
        </div>

      </motion.div>
    </div>
  );
}