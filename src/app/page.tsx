"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Lexend_Tera, Lexend } from "next/font/google";
import { Heart, BarChart3, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const lexendTera = Lexend_Tera({ subsets: ["latin"], weight: ["400", "700"] });
const lexend = Lexend({ subsets: ["latin"], weight: ["400", "500"] });

// tiny helpers
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Sweet Cursor
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

// SplitWords
function SplitWords({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span aria-label={text} className="inline-block">
      {text.split(" ").map((word, wi) => (
        <span key={wi} className="inline-block mr-2">
          {word.split("").map((ch, ci) => (
            <motion.span
              key={ci}
              initial={{ y: "120%", opacity: 0 }}
              whileInView={{ y: "0%", opacity: 1 }}
              viewport={{ once: true, margin: "-20%" }}
              transition={{
                delay: delay + wi * 0.05 + ci * 0.02,
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="inline-block"
            >
              {ch}
            </motion.span>
          ))}
        </span>
      ))}
    </span>
  );
}

// Organic Blobs
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
  const router = useRouter(); // ✅ properly initialized

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.06]);

  const [showHeader, setShowHeader] = useState(false);
  useEffect(() => {
    if (prefersReduced()) return;
    const onScroll = () => {
      const trackEl = document.getElementById("trackWord");
      if (trackEl) {
        const rect = trackEl.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.6) {
          setShowHeader(true);
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main
      className={`relative min-h-screen bg-[#ae87b7] text-[#fce7f3] ${lexend.className}`}
    >
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.05] mix-blend-multiply bg-[url('/noise.png')] bg-repeat" />
      <SweetCursor />

      {/* HEADER */}
      {showHeader && (
        <motion.header
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] w-[90%] rounded-full px-6 py-3 backdrop-blur-lg bg-white/10 border border-white/20 shadow-lg flex justify-between items-center"
        >
          <span
            className={`${lexendTera.className} font-semibold text-lg tracking-tight text-white`}
          >
            sweeten
          </span>

          <nav className="flex items-center space-x-6 text-sm">
            {["Home", "Features", "About"].map((item, i) => (
              <a
                key={i}
                href={`#${item.toLowerCase()}`}
                className="text-pink-200 hover:text-pink-400 transition"
              >
                {item}
              </a>
            ))}

            {/* Header Button */}
            <button
              onClick={() => router.push("/signup")}
              className="rounded-full px-5 py-2 bg-gradient-to-r from-[#ff5ea8] to-[#ff8acb] text-white font-medium shadow-md hover:scale-105 transition"
            >
              Get Started
            </button>
          </nav>
        </motion.header>
      )}

      {/* BACKGROUND BLOBS */}
<AnimatedBlob className="w-[70vw] h-[70vw] top-[-25%] left-1/2 -translate-x-1/2 animate-liquid" colors={["#ff66b2","#ff99cc","#ff85a2","#ffd6eb"]} />
<AnimatedBlob className="w-[60vw] h-[60vw] top-[0%] left-[25%] animate-liquid-fast" colors={["#ff8acb","#ffb3e6","#ff66b2","#ffe0f0"]} />
<AnimatedBlob className="w-[65vw] h-[65vw] top-[10%] right-[20%] animate-liquid-slow" colors={["#ff99cc","#ff66b2","#ff85a2","#ffaad5"]} />
<AnimatedBlob className="w-[75vw] h-[75vw] top-[25%] left-1/2 -translate-x-1/2 animate-liquid" colors={["#ffb3e6","#ff8acb","#ff66b2","#ffcce0"]} />
<AnimatedBlob className="w-[55vw] h-[55vw] top-[35%] left-[20%] animate-liquid-slow" colors={["#ffaad5","#ff66b2","#ff99cc","#ffd1e6"]} />
<AnimatedBlob className="w-[60vw] h-[60vw] top-[45%] right-[15%] animate-liquid-fast" colors={["#ff99cc","#ffb3e6","#ff66b2","#ffaad5"]} />
<AnimatedBlob className="w-[70vw] h-[70vw] top-[50%] left-[30%] animate-liquid" colors={["#ff80bf","#ff4da6","#ffa6d1","#ffd9ec"]} />
<AnimatedBlob className="w-[68vw] h-[68vw] top-[60%] left-[50%] animate-liquid-slow" colors={["#ffaad5","#ff66b2","#ff99cc","#ffbfe6"]} />
<AnimatedBlob className="w-[72vw] h-[72vw] top-[70%] left-[40%] animate-liquid-fast" colors={["#ff8acb","#ff66b2","#ffaad5","#ffe6f2"]} />
<AnimatedBlob className="w-[80vw] h-[80vw] top-[5%] left-[50%] -translate-x-1/2 animate-liquid" colors={["#d7a1f9","#b388eb","#c084fc","#e9d5ff"]} />
<AnimatedBlob className="w-[65vw] h-[65vw] top-[20%] left-[40%] animate-liquid-fast" colors={["#a5b4fc","#c084fc","#ffb3e6","#93c5fd"]} />

<style jsx global>{`
  @keyframes liquid {
    0% { border-radius: 40% 60% 70% 30% / 40% 30% 70% 60%; transform: translate(0,0) scale(1); }
    25% { border-radius: 60% 40% 30% 70% / 50% 60% 40% 50%; transform: translate(20px,-30px) scale(1.1); }
    50% { border-radius: 50% 50% 60% 40% / 60% 40% 50% 50%; transform: translate(-30px,20px) scale(0.95); }
    75% { border-radius: 70% 30% 40% 60% / 40% 50% 60% 50%; transform: translate(25px,25px) scale(1.12); }
    100% { border-radius: 40% 60% 70% 30% / 40% 30% 70% 60%; transform: translate(0,0) scale(1); }
  }
  .animate-liquid { animation: liquid 18s ease-in-out infinite; }
  .animate-liquid-slow { animation: liquid 28s ease-in-out infinite; }
  .animate-liquid-fast { animation: liquid 12s ease-in-out infinite; }
`}</style>


      {/* HERO */}
      <section className="relative h-[100vh] flex items-center justify-center overflow-hidden">
        <motion.div style={{ y: heroY, scale: heroScale }} className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-[#120914] via-[#1f0c19] to-transparent" />
        </motion.div>
        <div className="relative z-10 text-center px-6">
          <h1 className={`${lexendTera.className} text-white leading-none`}>
            <span className="block text-[16vw] sm:text-[10vw] tracking-tight">
              <SplitWords text="sweeten" />
            </span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="mt-4 text-white/80 text-lg sm:text-xl max-w-xl mx-auto">
            a soft, smart companion for diabetes—simple logs, gentle insights, brighter days.
          </motion.p>
        </div>
      </section>

      {/* STORY / ABOUT SECTION */}
      <section id="about" className="relative py-40 max-w-5xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className={`${lexendTera.className} text-4xl font-bold text-pink-100 mb-8`}
        >
          Built from the heart 💜
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          viewport={{ once: true }}
          className="text-lg leading-relaxed text-pink-200 mb-6"
        >
          Sweeten was born as a passion project—crafted with care to make diabetes management gentle, dreamy, and supportive.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0 }}
          viewport={{ once: true }}
          className="text-lg leading-relaxed text-pink-200"
        >
          Every screen is designed to soothe—pastel colors, soft motion, rounded shapes. It’s about making daily logging not just easy, but a moment of self-kindness.
        </motion.p>
      </section>

      {/* TYPO SCROLL */}
      <section className="relative py-40">
        <div className="flex flex-col items-center space-y-20">
          {["track.", "understand.", "thrive."].map((word, i) => (
            <motion.h2
              key={i}
              id={word.startsWith("track") ? "trackWord" : undefined}
              initial={{ opacity: 0, y: 80, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-20%" }}
              transition={{ delay: i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={`${lexendTera.className} text-[14vw] sm:text-[6vw] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-200 via-pink-400 to-pink-200 animate-gradient`}
            >
              {word}
            </motion.h2>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-40 bg-[#1a0d16]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-12 text-center">
          {[
            { icon: <Heart className="w-10 h-10 mx-auto text-pink-400" />, title: "Track Easily", desc: "Log your sugar, meals, and mood with a tap." },
            { icon: <BarChart3 className="w-10 h-10 mx-auto text-pink-400" />, title: "Understand Gently", desc: "See soft trends and kind insights, not harsh numbers." },
            { icon: <Sparkles className="w-10 h-10 mx-auto text-pink-400" />, title: "Thrive Freely", desc: "Turn data into small wins that make every day lighter." },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2, duration: 0.7 }}
              viewport={{ once: true, margin: "-10%" }}
              className="p-8 rounded-2xl shadow-lg bg-[#2a1322]/70 backdrop-blur-md hover:scale-105 transition"
            >
              {f.icon}
              <h3 className="mt-4 text-2xl font-semibold text-pink-100">{f.title}</h3>
              <p className="mt-3 text-base text-pink-200/90">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

   {/* CTA SECTION */}
      <section className="relative py-32 flex flex-col md:flex-row items-center justify-between px-10">
        {/* Left side text */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="md:w-1/2 space-y-6"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Ready to start your sweet journey?
          </h2>
          <p className="text-lg md:text-xl text-white/90 max-w-lg">
            Sweeten is built as a gentle companion for diabetes management—a passion project
            designed to bring comfort and clarity to your health journey. Simple, dreamy,
            and soft at every step.
          </p>

          {/* CTA Button as Link */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 bg-gradient-to-r from-pink-300 via-pink-400 to-pink-500 text-white font-semibold shadow-lg hover:shadow-pink-300/60 transition-all"
            >
              Get Started
              <motion.span
                animate={{ x: [0, 6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                →
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Right side detail card */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="md:w-1/2 mt-10 md:mt-0"
        >
          <div className="backdrop-blur-xl bg-white/40 rounded-3xl p-8 shadow-xl border border-white/60">
            <h3 className="text-2xl font-semibold text-[#7a004b] mb-4">What you’ll love 💕</h3>
            <ul className="space-y-3 text-[#7a004b]/80">
              <li>✨ Simple and soft interface—built with care</li>
              <li>📊 Easy logging and dreamy charts</li>
              <li>🌸 Gentle reminders, not stressful alerts</li>
              <li>💡 A passion project made with love</li>
            </ul>
          </div>
        </motion.div>
      </section>

      {/* VIDEO DEMO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-28 bg-[#120914]">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.8 }}
          className="text-4xl sm:text-5xl font-bold text-pink-100 mb-10 text-center"
        >
          See Sweeten in Action
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-4xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/20"
        >
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0"
            title="Sweeten App Demo"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="relative py-16 text-center text-pink-200 bg-[#1a0d16]">
        <p className="text-sm">© {new Date().getFullYear()} Sweeten. Built with love and softness.</p>
      </footer>
    </main>
  );
}
