"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Zap, Coffee, Brain, PlayCircle, RotateCcw, Clock, BookOpen } from "lucide-react";
import Link from "next/link";

// ─── Animation system ─────────────────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
const slideUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } };
// ─────────────────────────────────────────────────────────────────────────

type Mode = "balanced" | "panic";
type SessionType = "exam" | "task" | "break";

interface Block {
  id: number;
  time: string;
  duration: number;
  type: SessionType;
  subject: string;
  topic: string;
  session?: number; // session number label for panic mode
}

const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function roundUp5(d: Date) {
  const rem = 5 - (d.getMinutes() % 5);
  if (rem < 5) d.setMinutes(d.getMinutes() + rem);
  d.setSeconds(0, 0);
  return d;
}

const BALANCED_EXAM_TOPICS = ["Deep Study", "Review Notes", "Practise Problems", "Summarise Key Ideas"];
const BALANCED_TASK_TOPICS  = ["Work on Assignment", "Organise Notes", "Complete Exercises", "Quick Revision"];
const PANIC_TOPICS          = ["Core Concepts", "Key Formulas", "Practice Problems", "Past Paper Qs", "Speed Review"];

function buildBalanced(totalMins: number, exam: string): Block[] {
  const blocks: Block[] = [];
  const t = roundUp5(new Date()); let used = 0, id = 0, ei = 0, ti = 0, examTurn = true;
  while (used < totalMins) {
    const dur = Math.min(45, totalMins - used);
    if (examTurn) {
      blocks.push({ id: id++, time: fmt(t), duration: dur, type: "exam", subject: exam, topic: BALANCED_EXAM_TOPICS[ei++ % BALANCED_EXAM_TOPICS.length] });
    } else {
      blocks.push({ id: id++, time: fmt(t), duration: dur, type: "task", subject: "General Study", topic: BALANCED_TASK_TOPICS[ti++ % BALANCED_TASK_TOPICS.length] });
    }
    t.setMinutes(t.getMinutes() + dur); used += dur; examTurn = !examTurn;
    if (used < totalMins) {
      const bd = Math.min(10, totalMins - used);
      blocks.push({ id: id++, time: fmt(t), duration: bd, type: "break", subject: "Break", topic: "Recharge & Stretch" });
      t.setMinutes(t.getMinutes() + bd); used += bd;
    }
  }
  return blocks;
}

function buildPanic(totalMins: number, exam: string): Block[] {
  const blocks: Block[] = [];
  const t = roundUp5(new Date()); let used = 0, id = 0, session = 1;
  while (used < totalMins) {
    const dur = Math.min(25, totalMins - used);
    blocks.push({ id: id++, time: fmt(t), duration: dur, type: "exam", subject: exam, topic: PANIC_TOPICS[(session - 1) % PANIC_TOPICS.length], session });
    t.setMinutes(t.getMinutes() + dur); used += dur; session++;
    if (used < totalMins) {
      const bd = Math.min(5, totalMins - used);
      blocks.push({ id: id++, time: fmt(t), duration: bd, type: "break", subject: "Micro-Break", topic: "Breathe & Reset" });
      t.setMinutes(t.getMinutes() + bd); used += bd;
    }
  }
  return blocks;
}

function SessionCard({ block, index, mode }: { block: Block; index: number; mode: Mode }) {
  const isBreak = block.type === "break";
  const isExam  = block.type === "exam";
  const isPanic = mode === "panic";

  const cardStyle = isBreak
    ? "bg-[#F0EDE8] dark:bg-[#27272A] text-[#9A8C98] dark:text-gray-500"
    : isExam && isPanic
    ? "bg-[#ff6b6b] text-white dark:bg-[#2B1010] dark:border dark:border-red-500/30 dark:text-red-100"
    : isExam
    ? "bg-[#FFB7B2] text-[#2D3436] dark:bg-[#2B1010] dark:border dark:border-red-400/20 dark:text-red-100"
    : "bg-[#8FB996] text-white dark:bg-[#0D2B1A] dark:border dark:border-emerald-500/30 dark:text-emerald-100";

  return (
    <motion.div
      variants={slideUp}
      className={`relative rounded-[24px] p-5 shadow-sm flex items-center gap-4 ${cardStyle}`}
    >
      {/* Left: time + duration pill */}
      <div className="shrink-0 flex flex-col items-center justify-center bg-black/10 dark:bg-black/20 rounded-[16px] w-[62px] h-[62px] text-current">
        <span className="font-black text-sm leading-none">{block.time}</span>
        <span className="text-[10px] opacity-70 font-bold mt-0.5">{block.duration}m</span>
      </div>

      {/* Middle: label */}
      <div className="flex-1 min-w-0">
        {block.session && (
          <span className="text-[9px] font-black uppercase tracking-widest opacity-60 block mb-0.5">
            Session {block.session}
          </span>
        )}
        <p className="font-black text-base leading-tight truncate">{block.subject}</p>
        <p className="text-sm opacity-70 font-medium truncate">{block.topic}</p>
      </div>

      {/* Right: action or icon */}
      {isBreak ? (
        <Coffee size={20} className="opacity-40 shrink-0" />
      ) : (
        <Link href="/focus" onClick={(e) => e.stopPropagation()}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="bg-white/20 dark:bg-white/10 p-2.5 rounded-full shrink-0"
          >
            <PlayCircle size={18} />
          </motion.button>
        </Link>
      )}
    </motion.div>
  );
}

export default function SmartPlanner() {
  const [hours, setHours]       = useState(2);
  const [mode, setMode]         = useState<Mode>("balanced");
  const [generated, setGenerated] = useState(false);
  const [schedule, setSchedule] = useState<Block[]>([]);
  const [examSubject, setExamSubject] = useState("Your Exam");

  useEffect(() => {
    const saved = localStorage.getItem("examSubject");
    if (saved) setExamSubject(saved);
  }, []);

  const generate = () => {
    const mins = Math.round(hours * 60);
    const blocks = mode === "panic"
      ? buildPanic(mins, examSubject)
      : buildBalanced(mins, examSubject);
    setSchedule(blocks);
    setGenerated(true);
  };

  // Derived stats
  const studyBlocks  = schedule.filter(b => b.type !== "break");
  const breakMinutes = schedule.filter(b => b.type === "break").reduce((a, b) => a + b.duration, 0);
  const studyMinutes = schedule.filter(b => b.type !== "break").reduce((a, b) => a + b.duration, 0);

  // Approximate sessions estimate for preview (before generating)
  const previewSessions = mode === "panic"
    ? Math.floor((hours * 60) / 30)   // 25min + 5min
    : Math.floor((hours * 60) / 55);  // 45min + 10min

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#1C1917] safe-top flex flex-col transition-colors duration-500">
      <div className="flex-1 flex flex-col px-6 pb-10 w-full md:max-w-2xl md:mx-auto">

        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="flex justify-between items-center mb-8"
        >
          <Link href="/">
            <button className="bg-white dark:bg-[#292524] p-3 rounded-full shadow-sm text-gray-600 dark:text-gray-200 active:scale-95 transition-transform">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <span className="text-[#2D3436] dark:text-white font-bold tracking-widest opacity-80">SMART PLANNER</span>
          <div className="w-12" /> {/* spacer */}
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ════════════════ SETUP VIEW ════════════════ */}
          {!generated && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="flex-1 flex flex-col justify-center gap-6"
            >

              {/* Hero heading */}
              <div className="text-center">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-[#2D3436] dark:bg-white mb-4 shadow-lg"
                >
                  <Brain size={30} className="text-white dark:text-[#2D3436]" />
                </motion.div>
                <h1 className="text-3xl font-black text-[#2D3436] dark:text-white">Plan Your Session</h1>
                <p className="text-[#9A8C98] dark:text-gray-500 mt-1 text-sm">We'll build the optimal schedule for you.</p>
              </div>

              {/* ── TIME CARD ── */}
              <div className="bg-white dark:bg-[#292524] rounded-[32px] shadow-md p-6 space-y-5 transition-colors">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A8C98] mb-1">Available Time</p>
                    <div className="flex items-baseline gap-1.5">
                      <motion.span
                        key={hours}
                        initial={{ scale: 1.15, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        className="text-5xl font-black text-[#2D3436] dark:text-white leading-none"
                      >
                        {hours % 1 === 0 ? hours : hours.toFixed(1)}
                      </motion.span>
                      <span className="text-lg text-[#9A8C98] font-medium mb-0.5">
                        {hours === 1 ? "hour" : "hours"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A8C98] mb-1">Est. sessions</p>
                    <motion.p
                      key={`${previewSessions}-${mode}`}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="text-2xl font-black text-[#2D3436] dark:text-white"
                    >
                      ~{previewSessions}
                    </motion.p>
                  </div>
                </div>

                <input
                  type="range" min="1" max="8" step="0.5" value={hours}
                  onChange={(e) => setHours(parseFloat(e.target.value))}
                  className="w-full h-3 bg-gray-100 dark:bg-[#44403C] rounded-full appearance-none cursor-pointer accent-[#2D3436] dark:accent-white"
                />

                <div className="flex justify-between text-xs text-[#9A8C98] font-medium">
                  <span>1h</span><span>4h</span><span>8h</span>
                </div>
              </div>

              {/* ── MODE CARDS ── */}
              <div className="grid grid-cols-2 gap-3">

                {/* Balanced */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setMode("balanced")}
                  className={`p-5 rounded-[28px] border-2 text-left transition-all duration-200 ${
                    mode === "balanced"
                      ? "border-[#8FB996] bg-[#8FB996]/10 dark:bg-[#8FB996]/10"
                      : "border-transparent bg-white dark:bg-[#292524]"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center mb-3 ${mode === "balanced" ? "bg-[#8FB996]" : "bg-gray-100 dark:bg-[#44403C]"}`}>
                    <Coffee size={20} className={mode === "balanced" ? "text-white" : "text-[#9A8C98]"} />
                  </div>
                  <h3 className={`font-black text-sm mb-1 ${mode === "balanced" ? "text-[#5F8D6B] dark:text-emerald-400" : "text-[#9A8C98]"}`}>
                    Balanced
                  </h3>
                  <p className={`text-[11px] leading-relaxed ${mode === "balanced" ? "text-[#5F8D6B]/80 dark:text-emerald-400/70" : "text-[#9A8C98]/70"}`}>
                    45-min deep work, 10-min recovery. Alternates subjects for better retention.
                  </p>
                </motion.button>

                {/* Panic */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setMode("panic")}
                  className={`p-5 rounded-[28px] border-2 text-left transition-all duration-200 ${
                    mode === "panic"
                      ? "border-[#ff6b6b] bg-[#ff6b6b]/10 dark:bg-[#ff6b6b]/10"
                      : "border-transparent bg-white dark:bg-[#292524]"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center mb-3 ${mode === "panic" ? "bg-[#ff6b6b]" : "bg-gray-100 dark:bg-[#44403C]"}`}>
                    <Zap size={20} className={mode === "panic" ? "text-white" : "text-[#9A8C98]"} />
                  </div>
                  <h3 className={`font-black text-sm mb-1 ${mode === "panic" ? "text-[#cc4444] dark:text-red-400" : "text-[#9A8C98]"}`}>
                    Panic Mode
                  </h3>
                  <p className={`text-[11px] leading-relaxed ${mode === "panic" ? "text-[#cc4444]/80 dark:text-red-400/70" : "text-[#9A8C98]/70"}`}>
                    25-min Pomodoro sprints, 5-min breaks. Laser focus on your exam only.
                  </p>
                </motion.button>
              </div>

              {/* ── GENERATE BUTTON ── */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={generate}
                className={`w-full py-5 rounded-[24px] font-black text-lg shadow-lg flex items-center justify-center gap-3 transition-colors duration-300 active:scale-[0.98] ${
                  mode === "panic"
                    ? "bg-[#ff6b6b] text-white"
                    : "bg-[#2D3436] dark:bg-white text-white dark:text-[#2D3436]"
                }`}
              >
                <Brain size={22} />
                {mode === "panic" ? "Generate Crunch Plan" : "Generate My Schedule"}
              </motion.button>
            </motion.div>
          )}

          {/* ════════════════ SCHEDULE VIEW ════════════════ */}
          {generated && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="flex-1 flex flex-col"
            >

              {/* ── Summary header ── */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-black text-[#2D3436] dark:text-white">Your Plan</h2>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      mode === "panic"
                        ? "bg-[#ff6b6b]/15 text-[#cc4444] dark:bg-red-900/30 dark:text-red-400"
                        : "bg-[#8FB996]/20 text-[#5F8D6B] dark:bg-emerald-900/30 dark:text-emerald-400"
                    }`}>
                      {mode === "panic" ? "⚡ Panic" : "☕ Balanced"}
                    </span>
                  </div>
                  <p className="text-sm text-[#9A8C98] dark:text-gray-500 font-medium">
                    {studyBlocks.length} sessions · {studyMinutes}m study · {breakMinutes}m breaks
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setGenerated(false)}
                  className="p-2.5 rounded-full bg-gray-100 dark:bg-[#292524] text-[#9A8C98] dark:text-gray-400 active:scale-95 transition-transform"
                >
                  <RotateCcw size={18} />
                </motion.button>
              </div>

              {/* ── Smart insight strip ── */}
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
                className={`rounded-2xl px-4 py-3 mb-5 flex items-center gap-3 ${
                  mode === "panic"
                    ? "bg-[#ff6b6b]/10 dark:bg-red-900/20"
                    : "bg-[#8FB996]/10 dark:bg-emerald-900/20"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  mode === "panic" ? "bg-[#ff6b6b]" : "bg-[#8FB996]"
                }`}>
                  {mode === "panic" ? <Zap size={14} className="text-white" /> : <BookOpen size={14} className="text-white" />}
                </div>
                <p className={`text-xs font-bold leading-snug ${
                  mode === "panic" ? "text-[#cc4444] dark:text-red-400" : "text-[#5F8D6B] dark:text-emerald-400"
                }`}>
                  {mode === "panic"
                    ? `Full focus on ${examSubject}. 25-min Pomodoro cycles — proven for last-minute retention.`
                    : `Alternating ${examSubject} & general study every 45 mins optimises memory consolidation.`
                  }
                </p>
              </motion.div>

              {/* ── Block list ── */}
              <motion.div
                variants={stagger} initial="hidden" animate="show"
                className="flex flex-col gap-3 pb-6 md:grid md:grid-cols-2"
              >
                {schedule.map((block, i) => (
                  <SessionCard key={block.id} block={block} index={i} mode={mode} />
                ))}
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
