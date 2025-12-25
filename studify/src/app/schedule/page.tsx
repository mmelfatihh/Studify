"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Clock, Calendar } from "lucide-react";
import Link from "next/link";
import { db, auth } from "@/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function SchedulePage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Form State
  const [newTask, setNewTask] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newTime, setNewTime] = useState("");

  // --- 1. REAL-TIME LISTENER ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Listen to the 'schedule' collection in real-time
        const q = query(collection(db, "users", currentUser.uid, "schedule"), orderBy("time"));
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const loadedTasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTasks(loadedTasks);
          
          // AUTO-SYNC: Update the Dashboard with the TOP task
          if (loadedTasks.length > 0) {
            updateDashboard(currentUser.uid, loadedTasks[0]);
          } else {
             // If no tasks, clear dashboard
             updateDashboard(currentUser.uid, { subject: "Free Time", task: "No active tasks" });
          }
          setLoading(false);
        });
        return () => unsubscribeSnapshot();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Helper to sync with Home Screen
  const updateDashboard = async (uid: string, topTask: any) => {
    const dashboardRef = doc(db, "users", uid, "dashboard", "data");
    // We use "merge: true" so we don't accidentally delete the Exam data
    await updateDoc(dashboardRef, {
      "activeTask.subject": topTask.subject || "Free Time",
      "activeTask.title": topTask.task || "Relax",
    });
  };

  // --- 2. ADD TASK ---
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTask) return;

    await addDoc(collection(db, "users", user.uid, "schedule"), {
      task: newTask,
      subject: newSubject,
      time: newTime,
      createdAt: Date.now()
    });

    // Clear inputs
    setNewTask("");
    setNewSubject("");
    setNewTime("");
  };

  // --- 3. DELETE TASK ---
  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "users", user.uid, "schedule", id));
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] px-6 py-8 font-sans">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/">
          <button className="bg-gray-200 p-3 rounded-full text-gray-600 hover:bg-gray-300 transition-all">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <span className="text-gray-400 font-bold tracking-widest text-sm">TIMELINE</span>
      </div>

      <h1 className="text-[#2D3436] text-3xl font-bold mb-6">Today's Plan</h1>

      {/* --- INPUT FORM --- */}
      <form onSubmit={handleAddTask} className="bg-white p-6 rounded-[30px] shadow-sm mb-8 space-y-4">
        <div className="flex gap-3">
          <input 
            placeholder="Subject (e.g. Math)" 
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className="w-1/3 bg-gray-50 p-3 rounded-xl outline-none text-sm font-bold text-gray-600"
            required
          />
          <input 
            type="time" 
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="w-2/3 bg-gray-50 p-3 rounded-xl outline-none text-sm font-bold text-gray-600"
            required
          />
        </div>
        <div className="flex gap-3">
          <input 
            placeholder="Task Name (e.g. Finish Chapter 4)" 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="flex-1 bg-gray-50 p-3 rounded-xl outline-none text-sm"
            required
          />
          <button className="bg-[#2D3436] text-white p-3 rounded-xl hover:bg-black transition-colors">
            <Plus size={24} />
          </button>
        </div>
      </form>

      {/* --- TASK LIST --- */}
      <div className="space-y-4 pb-20">
        <AnimatePresence>
          {tasks.map((t, index) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`p-5 rounded-[25px] flex items-center justify-between group ${index === 0 ? "bg-[#8FB996] shadow-lg scale-105" : "bg-white shadow-sm"}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${index === 0 ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"}`}>
                  {index === 0 ? <Clock size={20} /> : <Calendar size={20} />}
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${index === 0 ? "text-white" : "text-gray-800"}`}>
                    {t.subject}
                  </h3>
                  <p className={`text-sm ${index === 0 ? "text-white/80" : "text-gray-400"}`}>
                    {t.task} • {t.time}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => handleDelete(t.id)}
                className={`p-2 rounded-full transition-colors ${index === 0 ? "text-white/60 hover:bg-white/20 hover:text-white" : "text-gray-300 hover:bg-red-50 hover:text-red-500"}`}
              >
                <Trash2 size={20} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {tasks.length === 0 && !loading && (
          <div className="text-center text-gray-400 mt-10">
            <p>No tasks yet. Enjoy your free time!</p>
          </div>
        )}
      </div>
    </div>
  );
}