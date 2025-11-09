"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";

// helpers
const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Animated Cursor
function SweetCursor() {
  const r = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!r.current || prefersReduced()) return;
    let raf = 0;
    let x = window.innerWidth / 2,
      y = window.innerHeight / 2;
    let tx = x,
      ty = y;

    const move = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const loop = () => {
      x += (tx - x) * 0.15;
      y += (ty - y) * 0.15;
      if (r.current)
        r.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", move);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div
      ref={r}
      className="pointer-events-none fixed z-[200] left-0 top-0 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 mix-blend-difference"
    />
  );
}

// Organic blobs
function AnimatedBlob({
  className,
  colors,
}: {
  className?: string;
  colors: string[];
}) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0.25 }}
      animate={{
        scale: [1, 1.1, 0.95, 1],
        opacity: [0.2, 0.35, 0.3, 0.25],
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      }}
      transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      className={`absolute rounded-full blur-3xl ${className}`}
      style={{
        backgroundImage: `linear-gradient(to right, ${colors.join(",")})`,
        backgroundSize: "200% 200%",
      }}
    />
  );
}

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#120914] text-[#fce7f3] px-6 overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.05] mix-blend-multiply bg-[url('/noise.png')] bg-repeat" />
      <SweetCursor />

      {/* Blobs */}
      <AnimatedBlob
        className="top-[-20%] left-[-10%] w-[40vw] h-[40vw] z-0"
        colors={["#ff5ea8", "#ff8acb"]}
      />
      <AnimatedBlob
        className="bottom-[-20%] right-[-10%] w-[35vw] h-[35vw] z-0"
        colors={["#7b5eff", "#9a82ff"]}
      />

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-xl p-8 shadow-xl border border-white/20"
      >
        <h1 className="text-4xl font-bold text-center mb-6 text-white">
          Welcome back
        </h1>

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <input
            className="w-full rounded-xl border border-white/20 bg-white/10 text-white p-4 focus:ring-2 focus:ring-pink-400 placeholder-pink-200/60"
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-white/20 bg-white/10 text-white p-4 focus:ring-2 focus:ring-pink-400 placeholder-pink-200/60"
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-[#ff5ea8] to-[#ff8acb] text-white py-3 text-lg font-medium shadow-md hover:scale-105 transition disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="my-6 text-center text-sm text-pink-200/80">or</div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full rounded-full border border-white/20 bg-white/10 text-white py-3 text-lg transition hover:scale-105 disabled:opacity-60"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-pink-200">
          New here?{" "}
          <a
            className="underline hover:text-pink-400"
            href="/signup"
          >
            Create an account
          </a>
        </p>
      </motion.div>
    </main>
  );
}
