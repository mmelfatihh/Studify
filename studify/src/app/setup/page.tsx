"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { motion } from "framer-motion";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // --- FORM DATA ---
  const [formData, setFormData] = useState({
    name: "",
    major: "",
    year: "",
    currentTaskSubject: "",
    currentTaskName: "",
    nextExamSubject: "",
    daysUntilExam: "",
  });

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const user = auth.currentUser;
    if (!user) return;

    try {
      // 1. Save Profile Info
      await setDoc(doc(db, "users", user.uid), {
        name: formData.name,
        major: formData.major,
        year: formData.year,
      });

      // 2. Save Dashboard "Active" Data (The Cards)
      await setDoc(doc(db, "users", user.uid, "dashboard", "data"), {
        activeTask: {
          subject: formData.currentTaskSubject,
          title: formData.currentTaskName,
        },
        nextExam: {
          subject: formData.nextExamSubject,
          daysLeft: formData.daysUntilExam,
        }
      });

      // 3. Create default attendance data if it doesn't exist
      await setDoc(doc(db, "users", user.uid, "attendance", "stats"), {
        total: 20,
        attended: 20, // Start safe
        required: 75
      }, { merge: true });

      // Done! Go Home.
      router.push("/");
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-8"
      >
        <h1 className="text-3xl font-bold text-[#2D3436] mb-2">Setup Your Profile</h1>
        <p className="text-gray-400 mb-8">Let's personalize your dashboard.</p>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* SECTION 1: ABOUT YOU */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#8FB996] uppercase tracking-wider">About You</h2>
            <div className="grid grid-cols-2 gap-4">
              <input name="name" placeholder="First Name" required onChange={handleChange} className="bg-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#8FB996]" />
              <select 
  name="year" 
  required 
  onChange={handleChange} 
  className="bg-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#8FB996] text-gray-700"
>
  <option value="" disabled selected>Select Year</option>
  <option value="1">Year 1</option>
  <option value="2">Year 2</option>
  <option value="3">Year 3</option>
  <option value="4">Year 4</option>
  <option value="5">Year 5+</option>
</select>
            </div>
            <input name="major" placeholder="Major (e.g. Computer Science)" required onChange={handleChange} className="w-full bg-gray-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#8FB996]" />
          </div>

          {/* SECTION 2: WHAT'S HAPPENING? */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#FFB7B2] uppercase tracking-wider">Priorities</h2>
            
            {/* Task Input */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <label className="text-xs font-bold text-gray-400 mb-2 block">WHAT ARE YOU STUDYING NOW?</label>
              <div className="grid grid-cols-2 gap-2">
                <input name="currentTaskSubject" placeholder="Subject (e.g. Math)" required onChange={handleChange} className="bg-white p-3 rounded-xl outline-none" />
                <input name="currentTaskName" placeholder="Topic (e.g. Calculus II)" required onChange={handleChange} className="bg-white p-3 rounded-xl outline-none" />
              </div>
            </div>

            {/* Exam Input */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <label className="text-xs font-bold text-gray-400 mb-2 block">NEXT BIG EXAM?</label>
              <div className="grid grid-cols-2 gap-2">
                <input name="nextExamSubject" placeholder="Subject (e.g. Physics)" required onChange={handleChange} className="bg-white p-3 rounded-xl outline-none" />
                <input name="daysUntilExam" type="number" placeholder="Days Left" required onChange={handleChange} className="bg-white p-3 rounded-xl outline-none" />
              </div>
            </div>
          </div>

          <button disabled={loading} className="w-full bg-[#2D3436] text-white font-bold py-4 rounded-2xl hover:bg-black transition-all">
            {loading ? "Saving..." : "Complete Setup"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}