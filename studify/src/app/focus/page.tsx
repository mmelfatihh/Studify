"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X, Play, Pause } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, collection } from "firebase/firestore";

// Helper to get initials (e.g. "John Doe" -> "JD")
const getInitials = (name: string) => {
  return name ? name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() : "??";
};

export default function FocusRoom() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [otherUsers, setOtherUsers] = useState<any[]>([]); // Real people!
  
  // TIMER STATE
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // --- 1. SETUP THE ROOM (JOIN & LISTEN) ---
  useEffect(() => {
    let unsubscribeAuth: any;
    let unsubscribeRoom: any;

    unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);

        // A. GET MY PROFILE DATA (So I can show it to others)
        // We need to know what Subject I am studying to display it
        const dashSnap = await getDoc(doc(db, "users", user.uid, "dashboard", "data"));
        const profileSnap = await getDoc(doc(db, "users", user.uid));
        
        const mySubject = dashSnap.exists() ? dashSnap.data().activeTask.subject : "Focusing";
        const myName = profileSnap.exists() ? profileSnap.data().name : "Student";

        // B. ADD ME TO THE 'ACTIVE_ROOM' COLLECTION
        // We assign random coordinates so we pop up in a random spot
        const myRoomRef = doc(db, "focus_room", user.uid);
        await setDoc(myRoomRef, {
          id: user.uid,
          name: myName,
          subject: mySubject,
          x: Math.random() * 80 + 10, // Keep within 10-90% of screen
          y: Math.random() * 80 + 10,
          color: Math.random() > 0.5 ? "bg-purple-400/30" : "bg-blue-400/30",
          joinedAt: Date.now()
        });

        // C. LISTEN FOR OTHERS (Real-time!)
        const roomCollection = collection(db, "focus_room");
        unsubscribeRoom = onSnapshot(roomCollection, (snapshot) => {
          const users: any[] = [];
          snapshot.forEach((doc) => {
            // Only add others (not myself)
            if (doc.id !== user.uid) {
              users.push(doc.data());
            }
          });
          setOtherUsers(users);
        });
      }
    });

    // CLEANUP: When I leave the page, remove me from the room!
    return () => {
      if (auth.currentUser) {
        deleteDoc(doc(db, "focus_room", auth.currentUser.uid));
      }
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeRoom) unsubscribeRoom();
    };
  }, []);

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#1a1a2e]">
      
      {/* BACKGROUND */}
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-purple-600/40 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-blue-600/40 rounded-full blur-[120px] animate-pulse"></div>
      
      {/* --- REAL FLOATING USERS --- */}
      {otherUsers.map((u) => (
        <motion.div
          key={u.id}
          initial={{ x: `${u.x}vw`, y: `${u.y}vh`, opacity: 0 }}
          animate={{ 
            x: [`${u.x}vw`, `${u.x + 5}vw`, `${u.x - 5}vw`],
            y: [`${u.y}vh`, `${u.y - 5}vh`, `${u.y + 5}vh`],
            opacity: 1
          }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "mirror" }}
          className={`absolute flex flex-col items-center justify-center`}
          style={{ left: 0, top: 0 }} // Positioning handled by motion
        >
          {/* THE BUBBLE */}
          <div className={`h-24 w-24 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg ${u.color}`}>
            <span className="text-white font-bold text-xl tracking-wider">
              {getInitials(u.name)}
            </span>
          </div>
          
          {/* THE SUBJECT LABEL */}
          <div className="mt-2 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">
              {u.subject}
            </p>
          </div>
        </motion.div>
      ))}

      {/* --- MY CENTER BUBBLE --- */}
      <motion.button
        onClick={() => setIsActive(!isActive)}
        initial={{ scale: 0 }}
        animate={{ scale: isActive ? 1.1 : 1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 200 }}
        className={`z-50 flex h-48 w-48 flex-col items-center justify-center rounded-full backdrop-blur-xl border border-white/20 shadow-[0_0_60px_rgba(255,255,255,0.2)] cursor-pointer transition-all duration-500 ${isActive ? "bg-green-500/20" : "bg-white/10"}`}
      >
        <span className="text-white/80 font-bold tracking-widest text-xl">
          {currentUser ? getInitials(currentUser.displayName || "ME") : "ME"}
        </span>
        <span className="text-white font-mono text-2xl mt-1 font-light">{formatTime(seconds)}</span>
        <div className="mt-2 text-white/50">
          {isActive ? <Pause size={20} /> : <Play size={20} />}
        </div>
      </motion.button>

      {/* TEXT INFO */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="z-50 mt-12 text-center"
      >
        <h1 className="text-white font-light text-2xl tracking-wide">
          {isActive ? "You are in the Zone" : "Tap bubble to start"}
        </h1>
        <p className="text-white/40 text-sm mt-2">
          {otherUsers.length === 0 
            ? "You are the first one here." 
            : `${otherUsers.length} others are focusing with you`}
        </p>
      </motion.div>

      {/* LEAVE BUTTON */}
      <Link href="/">
        <button className="absolute top-8 right-8 z-50 text-white/50 hover:text-white hover:rotate-90 transition-all duration-300">
          <X size={32} />
        </button>
      </Link>
    </div>
  );
}