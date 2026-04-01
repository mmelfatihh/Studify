"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import {
  LayoutDashboard, Calendar, Zap, BarChart3,
  Coffee, PlayCircle, Settings, Moon, Sun, LogOut,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

const NAV = [
  { href: "/",            label: "Dashboard",     icon: LayoutDashboard },
  { href: "/schedule",    label: "Smart Planner", icon: Calendar },
  { href: "/exam",        label: "Exam Pulse",    icon: Zap },
  { href: "/attendance",  label: "Bunk Budget",   icon: BarChart3 },
  { href: "/focus",       label: "Focus Room",    icon: Coffee },
  { href: "/simulator",   label: "Simulator",     icon: PlayCircle },
];

const NO_SIDEBAR = ["/login", "/setup", "/focus"];

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<{ name: string; major: string } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setProfile(snap.data() as { name: string; major: string });
      } else {
        setProfile(null);
      }
    });
    return () => unsub();
  }, []);

  if (NO_SIDEBAR.includes(pathname)) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 z-40 bg-[#FDFBF7] dark:bg-[#1C1917] border-r border-gray-100 dark:border-[#292524] transition-colors duration-500 select-none">

      {/* ── BRANDING ── */}
      <div className="px-6 pt-8 pb-5">
        <div className="flex items-center gap-3 mb-7">
          <div className="h-9 w-9 rounded-xl bg-[#8FB996] flex items-center justify-center shadow-sm shrink-0">
            <span className="text-white font-black text-sm tracking-tight">S</span>
          </div>
          <span className="font-black text-[#2D3436] dark:text-white tracking-[0.2em] text-sm">STUDIFY</span>
        </div>

        {/* User card */}
        {profile ? (
          <div className="flex items-center gap-3 bg-gray-100/80 dark:bg-[#292524] rounded-2xl px-3 py-2.5">
            <div className="h-8 w-8 rounded-full bg-[#C9ADA7] dark:bg-[#44403C] flex items-center justify-center shrink-0">
              <span className="text-white dark:text-gray-300 text-xs font-bold">{getInitials(profile.name)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[#2D3436] dark:text-[#E7E5E4] font-bold text-sm truncate leading-tight">{profile.name}</p>
              <p className="text-gray-400 dark:text-gray-600 text-[11px] truncate">{profile.major}</p>
            </div>
          </div>
        ) : (
          <div className="h-12 rounded-2xl bg-gray-100 dark:bg-[#292524] animate-pulse" />
        )}
      </div>

      <div className="mx-5 h-px bg-gray-100 dark:bg-[#292524]" />

      {/* ── NAV ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <LayoutGroup id="sidebar-nav">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors duration-150 cursor-pointer ${
                    active
                      ? "bg-[#8FB996]/15 dark:bg-emerald-500/10 text-[#5F8D6B] dark:text-emerald-400"
                      : "text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#292524] hover:text-gray-600 dark:hover:text-gray-400"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-2xl bg-[#8FB996]/15 dark:bg-emerald-500/10"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.8} className="relative z-10 shrink-0" />
                  <span className={`relative z-10 text-sm ${active ? "font-bold" : "font-medium"}`}>{label}</span>
                  {active && (
                    <div className="ml-auto relative z-10 h-1.5 w-1.5 rounded-full bg-[#8FB996] dark:bg-emerald-400" />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </LayoutGroup>
      </nav>

      <div className="mx-5 h-px bg-gray-100 dark:bg-[#292524]" />

      {/* ── BOTTOM ── */}
      <div className="px-3 py-4 space-y-0.5">
        <Link href="/settings">
          <motion.div
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors cursor-pointer ${
              pathname === "/settings"
                ? "bg-[#8FB996]/15 dark:bg-emerald-500/10 text-[#5F8D6B] dark:text-emerald-400"
                : "text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#292524] hover:text-gray-600 dark:hover:text-gray-400"
            }`}
          >
            <Settings size={18} strokeWidth={pathname === "/settings" ? 2.5 : 1.8} />
            <span className={`text-sm ${pathname === "/settings" ? "font-bold" : "font-medium"}`}>Settings</span>
          </motion.div>
        </Link>

        <motion.button
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.97 }}
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-[#292524] hover:text-gray-600 dark:hover:text-gray-400 transition-colors cursor-pointer"
        >
          {theme === "dark"
            ? <Sun size={18} strokeWidth={1.8} />
            : <Moon size={18} strokeWidth={1.8} />}
          <span className="text-sm font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </motion.button>

        {profile && (
          <motion.button
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-400 dark:hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut size={18} strokeWidth={1.8} />
            <span className="text-sm font-medium">Log out</span>
          </motion.button>
        )}
      </div>
    </aside>
  );
}
