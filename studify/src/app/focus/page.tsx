"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { X, Play, Pause } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, collection, query, limit } from "firebase/firestore";
import { invalidateDashCache } from "@/lib/dashCache";

const MAX_VISIBLE = 5;

const getInitials = (name: string) =>
  name ? name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() : "??";

const updateStreak = async (uid: string) => {
  const ref = doc(db, "users", uid, "streak", "data");
  const snap = await getDoc(ref);
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (snap.exists()) {
    const d = snap.data();
    if (d.lastStudied === today) return;
    const newCurrent = d.lastStudied === yesterday ? d.current + 1 : 1;
    await setDoc(ref, {
      lastStudied: today,
      current: newCurrent,
      longest: Math.max(d.longest || 0, newCurrent),
    });
  } else {
    await setDoc(ref, { lastStudied: today, current: 1, longest: 1 });
  }
};

export default function FocusRoom() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [otherUsers, setOtherUsers] = useState<any[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let unsubscribeAuth: any;
    let unsubscribeRoom: any;

    unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);

        // Read from localStorage (written by dashboard on load) — avoids 2 Firestore reads per join
        const myName = localStorage.getItem("studify_userName") || user.displayName || "Student";
        const mySubject = localStorage.getItem("studify_activeSubject") || "Focusing";

        const myRoomRef = doc(db, "focus_room", user.uid);
        await setDoc(myRoomRef, {
          id: user.uid,
          name: myName,
          subject: mySubject,
          x: Math.random() * 70 + 10,
          y: Math.random() * 70 + 10,
          color: Math.random() > 0.5 ? "bg-purple-400/30" : "bg-blue-400/30",
          joinedAt: Date.now(),
        });

        // Update streak on join — invalidate dashboard so flame count refreshes on return
        await updateStreak(user.uid);
        invalidateDashCache(user.uid);

        const roomCollection = query(collection(db, "focus_room"), limit(30));
        unsubscribeRoom = onSnapshot(roomCollection, (snapshot) => {
          const users: any[] = [];
          snapshot.forEach((doc) => {
            if (doc.id !== user.uid) users.push(doc.data());
          });
          setOtherUsers(users);
        });
      }
    });

    return () => {
      if (auth.currentUser) {
        deleteDoc(doc(db, "focus_room", auth.currentUser.uid));
      }
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeRoom) unsubscribeRoom();
    };
  }, []);

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

  const visibleUsers = otherUsers.slice(0, MAX_VISIBLE);
  const overflowCount = Math.max(0, otherUsers.length - MAX_VISIBLE);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#1a1a2e]">

      {/* BACKGROUND */}
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-purple-600/40 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-blue-600/40 rounded-full blur-[120px] animate-pulse" />

      {/* VISIBLE FLOATING USERS (capped at MAX_VISIBLE) */}
      <AnimatePresence>
        {visibleUsers.map((u) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              x: [`${u.x}vw`, `${u.x + 5}vw`, `${u.x - 5}vw`],
              y: [`${u.y}vh`, `${u.y - 5}vh`, `${u.y + 5}vh`],
              opacity: 1,
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 10, repeat: Infinity, repeatType: "mirror" }}
            className="absolute flex flex-col items-center justify-center"
            style={{ left: 0, top: 0 }}
          >
            <div className={`h-24 w-24 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg ${u.color}`}>
              <span className="text-white font-bold text-xl tracking-wider">
                {getInitials(u.name)}
              </span>
            </div>
            <div className="mt-2 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">
                {u.subject}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* OVERFLOW PILL */}
      <AnimatePresence>
        {overflowCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-16 right-8 z-50 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full"
          >
            <p className="text-white/80 text-xs font-bold">+{overflowCount} others studying</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MY CENTER BUBBLE */}
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
            : `${otherUsers.length} other${otherUsers.length > 1 ? "s" : ""} focusing with you`}
        </p>
      </motion.div>

      {/* LEAVE BUTTON */}
      <Link href="/">
        <button
          className="absolute right-8 z-50 text-white/50 hover:text-white hover:rotate-90 transition-all duration-300"
          style={{ top: "max(32px, env(safe-area-inset-top, 0px))" }}
        >
          <X size={32} />
        </button>
      </Link>
    </div>
  );
}
