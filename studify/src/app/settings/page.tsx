"use client";
import { motion } from "framer-motion";
import { ArrowLeft, Moon, Sun, LogOut, RotateCcw } from "lucide-react";
import Link from "next/link";
// SAFE IMPORT: Goes up two levels to src, then into components
import { useTheme } from "../../components/ThemeProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleResetExam = () => {
    localStorage.removeItem("examSubject");
    localStorage.removeItem("examDate");
    localStorage.removeItem("examPrep");
    alert("Exam Data Reset! Go set a new one.");
    router.push("/");
  };

  return (
    <div className="min-h-screen w-full px-6 py-8 transition-colors duration-500 bg-[#FDFBF7] dark:bg-[#18181B]">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-10">
        <Link href="/">
          <button className="bg-white dark:bg-[#27272A] p-3 rounded-full shadow-sm text-gray-600 dark:text-gray-200 hover:scale-105 transition-all">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <span className="text-[#2D3436] dark:text-white font-bold text-xl tracking-wide">Settings</span>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        
        {/* APPEARANCE SECTION */}
        <section className="bg-white dark:bg-[#27272A] p-6 rounded-[30px] shadow-sm transition-colors duration-500">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Appearance</h2>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-orange-100 text-orange-500'}`}>
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <span className="font-bold text-[#2D3436] dark:text-white text-lg">Dark Mode</span>
            </div>

            {/* THE TOGGLE SWITCH */}
            <button 
              onClick={toggleTheme}
              className={`w-14 h-8 rounded-full flex items-center px-1 transition-colors duration-300 ${theme === 'dark' ? 'bg-indigo-500' : 'bg-gray-300'}`}
            >
              <motion.div 
                layout
                className="bg-white w-6 h-6 rounded-full shadow-md"
              />
            </button>
          </div>
        </section>

        {/* DATA SECTION */}
        <section className="bg-white dark:bg-[#27272A] p-6 rounded-[30px] shadow-sm transition-colors duration-500">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Data Management</h2>
          
          <button 
            onClick={handleResetExam}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-[#3F3F46] rounded-2xl hover:bg-gray-100 dark:hover:bg-[#52525B] transition-colors"
          >
            <span className="font-bold text-[#2D3436] dark:text-white">Reset Exam Data</span>
            <RotateCcw size={18} className="text-gray-400" />
          </button>
        </section>

        {/* DANGER ZONE */}
        <button 
          onClick={handleLogout}
          className="w-full mt-8 border-2 border-red-100 dark:border-red-900/30 text-red-500 font-bold py-4 rounded-[25px] hover:bg-red-50 dark:hover:bg-red-900/10 transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Sign Out
        </button>

      </motion.div>
    </div>
  );
}