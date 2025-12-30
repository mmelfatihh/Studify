"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Zap, Coffee, Brain, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SessionType = "exam" | "task" | "break";

interface ScheduleItem {
  id: number;
  time: string;
  duration: number; 
  type: SessionType;
  subject: string;
  topic: string;
}

export default function SmartPlanner() {
  const router = useRouter();
  
  const [hours, setHours] = useState(2);
  const [intensity, setIntensity] = useState<"balanced" | "panic">("balanced");
  const [generated, setGenerated] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  
  const [examData, setExamData] = useState({ subject: "Exam", prep: 50 });
  const [taskData, setTaskData] = useState({ subject: "Task", title: "Assignment" });

  useEffect(() => {
    const savedSubject = localStorage.getItem("examSubject");
    const savedPrep = localStorage.getItem("examPrep");
    if (savedSubject) setExamData({ subject: savedSubject, prep: savedPrep ? parseInt(savedPrep) : 50 });
  }, []);

  const generateSchedule = () => {
    const totalMinutes = hours * 60;
    const newSchedule: ScheduleItem[] = [];
    let currentTime = new Date();
    const remainder = 15 - (currentTime.getMinutes() % 15);
    currentTime.setMinutes(currentTime.getMinutes() + remainder);

    let minutesUsed = 0;
    let idCounter = 0;

    while (minutesUsed < totalMinutes) {
      let blockDuration = 45; 
      if (totalMinutes - minutesUsed < 45) blockDuration = totalMinutes - minutesUsed;

      let type: SessionType = "exam";
      let subject = examData.subject;
      let topic = "Deep Focus Study";

      // LOGIC FIX:
      // Balanced = Alternate (Exam -> Task -> Exam)
      // Panic = ONLY Exam (Exam -> Exam -> Exam)
      const isTaskTurn = (idCounter % 2 !== 0) && intensity === "balanced";
      
      if (isTaskTurn) {
        type = "task";
        subject = taskData.subject;
        topic = taskData.title;
      } 
      
      newSchedule.push({
        id: idCounter++,
        time: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: blockDuration,
        type: type,
        subject: subject,
        topic: topic
      });

      currentTime.setMinutes(currentTime.getMinutes() + blockDuration);
      minutesUsed += blockDuration;

      // Add Break
      if (minutesUsed < totalMinutes) {
        const breakTime = 10;
        if (minutesUsed + breakTime <= totalMinutes) {
           newSchedule.push({
            id: idCounter++,
            time: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: breakTime,
            type: "break",
            subject: "Break",
            topic: "Recharge Brain"
          });
          currentTime.setMinutes(currentTime.getMinutes() + breakTime);
          minutesUsed += breakTime;
        }
      }
    }
    setSchedule(newSchedule);
    setGenerated(true);
  };

  const getCardColor = (type: SessionType) => {
    if (type === "exam") return "bg-[#FFB7B2] dark:bg-red-900/50 dark:border-red-500/30 dark:text-red-100 text-[#2D3436]"; 
    if (type === "task") return "bg-[#8FB996] dark:bg-emerald-900/50 dark:border-emerald-500/30 dark:text-emerald-100 text-white"; 
    return "bg-[#E8E8E4] dark:bg-[#3F3F46] text-gray-500 dark:text-gray-300"; 
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#18181B] px-6 py-8 flex flex-col transition-colors duration-500">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/">
          <button className="bg-white dark:bg-[#27272A] p-3 rounded-full shadow-sm text-gray-600 dark:text-gray-200 hover:scale-105 transition-all">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <span className="text-[#2D3436] dark:text-white font-bold tracking-widest opacity-80">SMART PLANNER</span>
      </div>

      {!generated ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col justify-center space-y-10">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-[#2D3436] dark:text-white">Draft Your Day</h1>
            <p className="text-gray-400">Tell us your availability, we'll do the rest.</p>
          </div>

          <div className="bg-white dark:bg-[#27272A] p-8 rounded-[40px] shadow-xl space-y-6 transition-colors">
            <div className="flex justify-between items-end">
              <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Time Available</span>
              <span className="text-4xl font-bold text-[#2D3436] dark:text-white">{hours} <span className="text-lg text-gray-400 font-medium">Hours</span></span>
            </div>
            <input type="range" min="1" max="8" step="0.5" value={hours} onChange={(e) => setHours(parseFloat(e.target.value))} className="w-full h-4 bg-gray-100 dark:bg-[#3F3F46] rounded-full appearance-none cursor-pointer accent-[#2D3436] dark:accent-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setIntensity("balanced")} className={`p-6 rounded-[30px] border-2 transition-all ${intensity === 'balanced' ? 'border-[#8FB996] bg-[#8FB996]/10 dark:bg-emerald-900/20' : 'border-transparent bg-white dark:bg-[#27272A]'}`}>
              <Coffee className={`mb-3 ${intensity === 'balanced' ? 'text-[#8FB996]' : 'text-gray-300'}`} />
              <h3 className={`font-bold text-left ${intensity === 'balanced' ? 'text-[#8FB996]' : 'text-gray-400'}`}>Balanced</h3>
            </button>
            <button onClick={() => setIntensity("panic")} className={`p-6 rounded-[30px] border-2 transition-all ${intensity === 'panic' ? 'border-[#FFB7B2] bg-[#FFB7B2]/10 dark:bg-red-900/20' : 'border-transparent bg-white dark:bg-[#27272A]'}`}>
              <Zap className={`mb-3 ${intensity === 'panic' ? 'text-[#FFB7B2]' : 'text-gray-300'}`} />
              <h3 className={`font-bold text-left ${intensity === 'panic' ? 'text-[#FFB7B2]' : 'text-gray-400'}`}>Panic Mode</h3>
            </button>
          </div>

          <button onClick={generateSchedule} className="w-full bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436] font-bold py-5 rounded-[25px] shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
            <Brain size={20} />
            Generate Schedule
          </button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#2D3436] dark:text-white">Your Plan</h2>
              <p className="text-gray-400 text-sm">{hours} Hours • {intensity === 'panic' ? 'High Intensity' : 'Balanced Flow'}</p>
            </div>
            <button onClick={() => setGenerated(false)} className="text-xs font-bold text-gray-400 hover:text-[#2D3436] dark:hover:text-white">RESET</button>
          </div>
          <div className="space-y-4 pb-20 overflow-y-auto hide-scrollbar">
            <AnimatePresence>
              {schedule.map((item, index) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className={`relative p-6 rounded-[30px] ${getCardColor(item.type)} shadow-sm flex items-center justify-between border-2 border-transparent`}>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center bg-white/20 backdrop-blur-sm w-16 h-16 rounded-[20px] text-current">
                      <span className="font-bold text-sm">{item.time}</span>
                      <span className="text-[10px] opacity-70">{item.duration}m</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{item.subject}</h3>
                      <p className="text-sm opacity-80 font-medium">{item.topic}</p>
                    </div>
                  </div>
                  {item.type !== 'break' && <Link href="/focus"><button className="bg-white/20 p-3 rounded-full"><ChevronRight size={20} /></button></Link>}
                  {item.type === 'break' && <Coffee size={24} className="opacity-50 mr-2" />}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}