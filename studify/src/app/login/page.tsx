"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- THE LOGIC: Talking to Firebase ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); // Stop page from refreshing
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Log In existing user
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Create new user
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // If successful, go to Dashboard
      router.push("/"); 
    } catch (err: any) {
      // If error (e.g., wrong password), show it
      console.error(err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7] px-6">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2D3436] mb-2">
            {isLogin ? "Welcome Back" : "Join Studify"}
          </h1>
          <p className="text-gray-400">
            {isLogin ? "Ready to focus?" : "Start your streak today."}
          </p>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-xl text-sm font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-100 px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#8FB996] transition-all text-gray-800 font-medium"
              required
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-100 px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#8FB996] transition-all text-gray-800 font-medium"
              required
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-[#2D3436] text-white font-bold py-4 rounded-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>

        {/* TOGGLE BUTTON */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            {isLogin ? "New here?" : "Already have an account?"}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-[#8FB996] font-bold hover:underline"
            >
              {isLogin ? "Sign Up" : "Log In"}
            </button>
          </p>
        </div>

      </motion.div>
    </div>
  );
}