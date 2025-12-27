"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Zap, Coffee, Brain, ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- TYPES ---
type SessionType = "exam" | "task" | "break";

interface ScheduleItem {
  id: number;
  time: string;
  duration: number; // in minutes
  type: SessionType;
  subject: string;
  topic: string;
}

export default function SmartPlanner() {
  const router = useRouter();
  
  // --- STATE ---
  const [hours, setHours] = useState(2); // Default 2 hours
  const [intensity, setIntensity] = useState<"balanced" | "panic">("balanced");
  const [generated, setGenerated] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  
  // Data from "The Brain" (Local Storage & State)
  const [examData, setExamData] = useState({ subject: "Exam", prep: 50 });
  const [taskData, setTaskData] = useState({ subject: "Task", title: "Assignment" });

  // 1. LOAD DATA
  useEffect(() => {
    // Get Exam Data (Local Storage)
    const savedSubject = localStorage.getItem("examSubject");
    const savedPrep = localStorage.getItem("examPrep");
    if (savedSubject) {
      setExamData({
        subject: savedSubject,
        prep: savedPrep ? parseInt(savedPrep) : 50
      });
    }

    // Get Active Task (We'll assume it was passed or grab from a temp storage if needed)
    // For now, let's use a placeholder or read from a simple local storage if you want to sync perfectly.
    // Ideally, we'd read this from Firebase context, but for the Planner V1, let's keep it simple.
  }, []);

  // 2. THE ALGORITHM 🧠
  const generateSchedule = () => {
    const totalMinutes = hours * 60;
    const newSchedule: ScheduleItem[] = [];
    let currentTime = new Date();
    // Round to next 15 min
    const remainder = 15 - (currentTime.getMinutes() % 15);
    currentTime.setMinutes(currentTime.getMinutes() + remainder);

    let minutesUsed = 0;
    let idCounter = 0;

    // RULE: Panic Mode = 80% Exam. Balanced = 50/50.
    const examFocusRatio = intensity === "panic" ? 0.8 : 0.5;

    while (minutesUsed < totalMinutes) {
      // 1. Determine Block Length (Deep Work vs Quick Task)
      // If we have a lot of time left, do a 45m block. If not, fill the rest.
      let blockDuration = 45; 
      if (totalMinutes - minutesUsed < 45) blockDuration = totalMinutes - minutesUsed;

      // 2. Decide Subject (Exam vs Task)
      // Simple toggle: If Panic mode, mostly Exam.
      // We use a random check weighted by the ratio to vary it slightly, 
      // OR just strict alternation. Let's do strict alternation for clarity, 
      // but skip "Task" if ratio is high.
      
      let type: SessionType = "exam";
      let subject = examData.subject;
      let topic = "Deep Focus Study";

      // If Balanced, we alternate. If Panic, we only insert Task every 3rd block.
      const isTaskTurn = (idCounter % 2 !== 0) && intensity === "balanced";
      
      if (isTaskTurn) {
        type = "task";
        subject = taskData.subject; // "Active Task"
        topic = taskData.title;
      } 
      
      // If Panic Mode, we force Exam unless it's a break
      if (intensity === "panic" && type === "task") {
         // Override task with Exam occasionally? No, let's just keep it focused.
         type = "exam";
         subject = examData.subject;
         topic = "Cram Session";
      }

      // 3. Add The Block
      newSchedule.push({
        id: idCounter++,
        time: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: blockDuration,
        type: type,
        subject: subject,
        topic: topic
      });

      // Update counters
      currentTime.setMinutes(currentTime.getMinutes() + blockDuration);
      minutesUsed += blockDuration;

      // 4. INSERT BREAK (If not finished)
      if (minutesUsed < totalMinutes) {
        const breakTime = 10;
        // Don't add break if it exceeds time
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

  // Helper for Colors
  const getCardColor = (type: SessionType) => {
    if (type === "exam") return "bg-[#FFB7B2] text-[#2D3436]"; // Soft Red
    if (type === "task") return "bg-[#8FB996] text-white"; // Sage Green
    return "bg-[#E8E8E4] text-gray-500"; // Grey for break
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] px-6 py-8 flex flex-col">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/">
          <button className="bg-white p-3 rounded-full shadow-sm text-gray-600 hover:bg-gray-50 transition-all">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <span className="text-[#2D3436] font-bold tracking-widest opacity-80">SMART PLANNER</span>
      </div>

      {!generated ? (
        /* --- STEP 1: INPUT SCREEN --- */
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col justify-center space-y-10"
        >
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-[#2D3436]">Draft Your Day</h1>
            <p className="text-gray-400">Tell us your availability, we'll do the rest.</p>
          </div>

          {/* SLIDER */}
          <div className="bg-white p-8 rounded-[40px] shadow-xl space-y-6">
            <div className="flex justify-between items-end">
              <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Time Available</span>
              <span className="text-4xl font-bold text-[#2D3436]">{hours} <span className="text-lg text-gray-400 font-medium">Hours</span></span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="8" 
              step="0.5"
              value={hours} 
              onChange={(e) => setHours(parseFloat(e.target.value))}
              className="w-full h-4 bg-gray-100 rounded-full appearance-none cursor-pointer accent-[#2D3436]"
            />
            <div className="flex justify-between text-xs text-gray-300 font-bold">
              <span>1H</span>
              <span>8H</span>
            </div>
          </div>

          {/* INTENSITY TOGGLE */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setIntensity("balanced")}
              className={`p-6 rounded-[30px] border-2 transition-all ${intensity === 'balanced' ? 'border-[#8FB996] bg-[#8FB996]/10' : 'border-transparent bg-white'}`}
            >
              <Coffee className={`mb-3 ${intensity === 'balanced' ? 'text-[#8FB996]' : 'text-gray-300'}`} />
              <div className="text-left">
                <h3 className={`font-bold ${intensity === 'balanced' ? 'text-[#8FB996]' : 'text-gray-400'}`}>Balanced</h3>
                <p className="text-xs text-gray-400 mt-1">Mix of tasks & study.</p>
              </div>
            </button>

            <button 
              onClick={() => setIntensity("panic")}
              className={`p-6 rounded-[30px] border-2 transition-all ${intensity === 'panic' ? 'border-[#FFB7B2] bg-[#FFB7B2]/10' : 'border-transparent bg-white'}`}
            >
              <Zap className={`mb-3 ${intensity === 'panic' ? 'text-[#FFB7B2]' : 'text-gray-300'}`} />
              <div className="text-left">
                <h3 className={`font-bold ${intensity === 'panic' ? 'text-[#FFB7B2]' : 'text-gray-400'}`}>Panic Mode</h3>
                <p className="text-xs text-gray-400 mt-1">Focus on the Exam.</p>
              </div>
            </button>
          </div>

          <button 
            onClick={generateSchedule}
            className="w-full bg-[#2D3436] text-white font-bold py-5 rounded-[25px] shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Brain size={20} />
            Generate Schedule
          </button>

        </motion.div>
      ) : (
        /* --- STEP 2: RESULT STREAM --- */
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col"
        >
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#2D3436]">Your Plan</h2>
              <p className="text-gray-400 text-sm">{hours} Hours • {intensity === 'panic' ? 'High Intensity' : 'Balanced Flow'}</p>
            </div>
            <button 
              onClick={() => setGenerated(false)} 
              className="text-xs font-bold text-gray-400 hover:text-[#2D3436]"
            >
              RESET
            </button>
          </div>

          <div className="space-y-4 pb-20 overflow-y-auto hide-scrollbar">
            <AnimatePresence>
              {schedule.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative p-6 rounded-[30px] ${getCardColor(item.type)} shadow-sm flex items-center justify-between group`}
                >
                  <div className="flex items-center gap-4">
                    {/* Time Bubble */}
                    <div className="flex flex-col items-center justify-center bg-white/20 backdrop-blur-sm w-16 h-16 rounded-[20px]">
                      <span className="font-bold text-sm">{item.time}</span>
                      <span className="text-[10px] opacity-70">{item.duration}m</span>
                    </div>
                    
                    {/* Info */}
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{item.subject}</h3>
                      <p className="text-sm opacity-80 font-medium">{item.topic}</p>
                    </div>
                  </div>

                  {/* Action Button (Only for tasks) */}
                  {item.type !== 'break' && (
                    <Link href="/focus">
                      <button className="bg-white/20 hover:bg-white/40 p-3 rounded-full transition-colors backdrop-blur-md">
                        <ChevronRight size={20} />
                      </button>
                    </Link>
                  )}
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