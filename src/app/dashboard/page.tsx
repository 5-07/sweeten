// app/dashboard/page.tsx 
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lexend, Lexend_Tera } from "next/font/google";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getDoc, doc, collection, getDocs, addDoc, deleteDoc, Timestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
// 🛑 Import the correct dialog component and utilities
import TodayVitalsDialog from "@/components/TodayVitalsDialog";
import { fetchAllVitals, fetchUserPlan, VitalsEntry } from "@/lib/vitals";
import {
  Activity,
  ClipboardList,
  House,
  LineChart,
  LogOut,
  UserRound,
  X,
  Bell,
  Plus,
  Trash2,
} from "lucide-react";

// ... (Font and constant definitions remain the same) ...

const lexend = Lexend({ subsets: ["latin"], weight: ["400", "500"] });
const lexendTera = Lexend_Tera({ subsets: ["latin"], weight: ["700"] });

const PASTELS = [
  "bg-[#fde7f2] text-[#7a004b]",
  "bg-[#fff3b0] text-[#4a0034]",
  "bg-[#eedbff] text-[#4a0034]",
  "bg-[#dff7f2] text-[#4a0034]",
];

type Reminder = {
  id: string;
  text: string;
  createdAt: number;
};

// 🛑 Removed isoToday and local VitalEntry definition since they are in lib/vitals.ts

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<{ username?: string; photoURL?: string } | null>(null);
  // 🛑 Now using the VitalsEntry type from lib/vitals and storing a list
  const [vitals, setVitals] = useState<VitalsEntry[]>([]); 
  const [menuOpen, setMenuOpen] = useState(false);

  // Modal state for "Today" quick entry (uses imported dialog)
  const [showToday, setShowToday] = useState(false);
  
  // --- NEW: reminders state & modal ---
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newReminderText, setNewReminderText] = useState("");
  const [reminderSaving, setReminderSaving] = useState(false);

  // --- Plan preview state (plain text) ---
  const [planPreview, setPlanPreview] = useState<string | null>(null);

  // --- Initial data load & Auth gate (Refactored) ---
  const loadData = async (u: any) => {
    // Load Profile
    const snap = await getDoc(doc(db, "users", u.uid));
    if (snap.exists()) {
      const data: any = snap.data();
      setProfile({
        username: data.username || u.displayName || undefined,
        photoURL: data.photoURL || u.photoURL || undefined,
      });
    } else {
      await setDoc(doc(db, "users", u.uid), { createdAt: Timestamp.now() }, { merge: true });
    }

    // 🛑 Load Vitals from subcollection (FIXED data source)
    try {
      const loadedVitals = await fetchAllVitals(u.uid);
      setVitals(loadedVitals);
    } catch (e) {
      console.error("Failed to load vitals", e);
    }

    // Load Reminders
    try {
      const remSnap = await getDocs(collection(db, "users", u.uid, "reminders"));
      const rems: Reminder[] = remSnap.docs.map((d) => {
        const r = d.data() as any;
        return { id: d.id, text: r.text, createdAt: r.createdAt?.toMillis() ?? Date.now() };
      });
      setReminders(rems);
    } catch (e) {
      console.error("Failed to load reminders", e);
    }

    // 🛑 Load Plan Preview using new utility
    try {
      const plan = await fetchUserPlan(u.uid);

      if (plan) {
        // New plan structure: plan.focus, plan.message, plan.dayPlans
        const focus = plan.focus || "Balanced Maintenance Week";
        const message = plan.message || "";
        const firstDayPlan = plan.dayPlans?.[0];
        const firstDietTip = firstDayPlan?.diet?.[0] || "";
        
        setPlanPreview(
          `Focus: ${focus}\n${message}\n\n${firstDietTip ? `Today: ${firstDietTip}` : ""}`
        );
      } else {
        setPlanPreview(null);
      }

    } catch (e) {
      console.error("Failed to load plan preview", e);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/signin");
        return;
      }
      setUser(u);
      loadData(u);
    });
    return () => unsub();
  }, [router]);

  // 🛑 Removed redundant useEffect that handled prefilling the local modal state

  // Count a day as filled if bloodSugar is present
  const filledDays = useMemo(() => {
    if (!Array.isArray(vitals)) return 0;
    // 🛑 Vitals from subcollection are now full objects, filtering on non-null bloodSugar is better.
    return vitals.filter((d) => d && d.bloodSugar !== null).length;
  }, [vitals]);

  const planUnlocked = filledDays >= 7;

  const btnBase = "inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition-all duration-300 will-change-transform hover:-translate-y-0.5 hover:shadow-xl";

  // 🛑 Removed saveTodayToFirestore as we use the logic in TodayVitalsDialog.tsx now

  // --- Reminders functions (Firestore-backed, kept as-is) ---
  async function openAddReminderModal() {
    setNewReminderText("");
    setShowReminderModal(true);
  }

  async function handleAddReminder() {
    if (!user || !newReminderText.trim()) return;
    setReminderSaving(true);
    try {
      const colRef = collection(db, "users", user.uid, "reminders");
      const docRef = await addDoc(colRef, { text: newReminderText.trim(), createdAt: Timestamp.now() });
      const newR: Reminder = { id: docRef.id, text: newReminderText.trim(), createdAt: Date.now() };
      setReminders((s) => [...s, newR]);
      setShowReminderModal(false);
      setNewReminderText("");
    } catch (e) {
      console.error("Failed to add reminder", e);
    } finally {
      setReminderSaving(false);
    }
  }

  async function removeReminder(id: string) {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "reminders", id));
      setReminders((s) => s.filter((r) => r.id !== id));
    } catch (e) {
      console.error("Failed to delete reminder", e);
    }
  }

  // Helper: small preview of plan (first few lines)
  function planSnippet(text: string | null | undefined, limit = 140) {
    if (!text) return "No plan yet. Generate one from Vitals.";
    const cleaned = text.replace(/\n+/g, " ").trim();
    return cleaned.length > limit ? cleaned.slice(0, limit).trim() + "…" : cleaned;
  }

  // Compute vitals summary: pick latest entry
  const latestVitals = vitals && vitals.length ? vitals[vitals.length - 1] : null;

  return (
    <div className={`${lexend.className} min-h-screen bg-[#f8f6f8] text-[#4a0034]`}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/50 border-b border-[#7a004b1a]">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className={`${lexendTera.className} text-2xl tracking-tight text-[#7a004b]`}>sweeten</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/dashboard/vitals")} className={`${btnBase} bg-[#7a004b] text-white hover:bg-[#5c0037]`}>
              <Activity size={18} /> Enter Vitals
            </button>
            <div className="relative">
              <button onClick={() => setMenuOpen((s) => !s)} className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profile?.photoURL || "/default-avatar.png"} alt="avatar" className="h-9 w-9 rounded-full border border-[#7a004b33] object-cover" />
                <span className="sr-only">Open menu</span>
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 mt-2 w-44 rounded-xl border border-[#7a004b1a] bg-white shadow-lg">
                    <div className="px-3 py-2 text-sm">
                      <p className="font-semibold truncate">{profile?.username || user?.email?.split("@")[0]}</p>
                    </div>
                    <button onClick={() => router.push("/dashboard")} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#7a004b0a]">
                      <UserRound size={16} /> Profile
                    </button>
                    <button onClick={() => signOut(auth)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#7a004b0a] text-[#7a004b]">
                      <LogOut size={16} /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-6xl px-6 pt-10 pb-28">
        {/* Greeting */}
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${lexendTera.className} text-5xl sm:text-6xl text-[#7a004b] mb-6`}>
          hello, {profile?.username || user?.email?.split("@")[0] || "sweetheart"}
        </motion.h2>
        <p className="text-lg text-[#6e3a5a] mb-8 max-w-2xl">
          Track your week, then unlock a personalized plan crafted for your goals. You’re {Math.min(filledDays, 7)} / 7 days in.
        </p>

        {/* Progress row */}
        <div className="mb-10">
          <div className="h-3 w-full rounded-full bg-[#7a004b15] overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(Math.min(filledDays, 7) / 7) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} className="h-full bg-[#7a004b]" />
          </div>
          <div className="mt-2 text-sm text-[#6e3a5a]">{filledDays >= 7 ? "You’re ready!" : `Complete ${7 - filledDays} more day(s) to unlock your plan.`}</div>
        </div>

        {/* Action Cards (unchanged) */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Today", desc: "Log today’s vitals in a minute.", href: "/dashboard/vitals", icon: <ClipboardList className="opacity-80" size={18} /> },
            { title: "Weekly Overview", desc: "See your 7-day trends.", href: "/dashboard/vitals", icon: <LineChart className="opacity-80" size={18} /> },
            { title: "Your Plan", desc: planUnlocked ? "Personalized plan is ready." : "Unlock after 7 days.", href: planUnlocked ? "/dashboard/plan" : undefined, icon: <Activity className="opacity-80" size={18} /> },
          ].map((card, i) => (
            <motion.button
              key={card.title}
              onClick={() => {
                if (card.title === "Today") {
                  setShowToday(true);
                } else if (card.href) {
                  router.push(card.href);
                }
              }}
              disabled={!card.href && card.title !== "Today"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className={`text-left rounded-3xl p-6 shadow-lg border border-[#7a004b12] ${PASTELS[i % PASTELS.length]} ${ (card.href || card.title === "Today") ? "hover:shadow-xl hover:-translate-y-0.5" : "opacity-60 cursor-not-allowed" } transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`${lexendTera.className} text-2xl`}>{card.title}</h3>
                {card.icon}
              </div>
              <p className="text-sm opacity-80">{card.desc}</p>
            </motion.button>
          ))}
        </section>

        {/* 7-day tiles (same) */}
        <section className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => {
            const filled = i < filledDays;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 * i }} className={`rounded-2xl p-4 text-center border border-[#7a004b12] ${PASTELS[i % PASTELS.length]} ${filled ? "" : "opacity-80"}`}>
                <div className={`${lexendTera.className} text-xl mb-1`}>Day {i + 1}</div>
                <div className="text-xs opacity-80">{filled ? "logged" : "not yet"}</div>
              </motion.div>
            );
          })}
        </section>

        {/* --- NEW: Vitals Summary row + Plan preview + Reminders --- */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vitals summary (3 small pastel cards) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`${lexendTera.className} text-xl`}>Vitals summary</h3>
              <div className="text-sm text-slate-600">Latest</div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className={`rounded-2xl p-4 border border-[#7a004b12] ${PASTELS[0]}`}>
                <div className="text-sm opacity-70">Glucose</div>
                <div className="text-2xl font-semibold mt-2">{latestVitals?.bloodSugar ?? "—"}</div>
                <div className="text-xs opacity-80 mt-1">mg/dL</div>
              </div>

              <div className={`rounded-2xl p-4 border border-[#7a004b12] ${PASTELS[1]}`}>
                <div className="text-sm opacity-70">Carbs</div>
                <div className="text-2xl font-semibold mt-2">{latestVitals?.carbs ?? "—"}</div>
                <div className="text-xs opacity-80 mt-1">g</div>
              </div>

              <div className={`rounded-2xl p-4 border border-[#7a004b12] ${PASTELS[2]}`}>
                <div className="text-sm opacity-70">Steps</div>
                <div className="text-2xl font-semibold mt-2">{latestVitals?.steps ?? "—"}</div>
                <div className="text-xs opacity-80 mt-1">steps</div>
              </div>
            </div>
          </div>

          {/* Plan preview card (plain text snippet) */}
          <div className="rounded-3xl p-6 border border-[#7a004b12] bg-white shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className={`${lexendTera.className} text-xl`}>Your weekly plan</h3>
                <p className="text-xs opacity-80 mt-1">{planUnlocked ? "Click to view full plan" : "Locked — complete 7 days to unlock"}</p>
              </div>
              <div>
                <button onClick={() => { if (planUnlocked) router.push("/dashboard/plan"); }} className={`text-sm font-medium ${planUnlocked ? "hover:underline" : "opacity-50 cursor-not-allowed"}`}>Open</button>
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-700">
              <div className="whitespace-pre-wrap">{planPreview ? planSnippet(planPreview, 160) : (planUnlocked ? "Plan generating… or click generate on vitals." : "Locked")}</div>
            </div>
          </div>

          {/* Reminders column (stacked) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`${lexendTera.className} text-xl flex items-center gap-2`}><Bell className="text-[#7a004b]" size={18} /> Reminders</h3>
              <div className="flex items-center gap-2">
                <button onClick={openAddReminderModal} className="text-sm font-medium hover:underline flex items-center gap-2"><Plus size={14}/> Add</button>
              </div>
            </div>

            <div className="space-y-3">
              {reminders.length === 0 && <div className="text-sm text-slate-500">No reminders yet. Add one.</div>}
              {reminders.map((r) => (
                <motion.div key={r.id} layout className="flex items-center justify-between p-3 rounded-2xl border border-[#7a004b12] bg-white">
                  <div className="text-sm">{r.text}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeReminder(r.id)} className="text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Primary CTA row (kept as-is) */}
        <div className="mt-12 flex flex-wrap items-center gap-3">
          <button onClick={() => router.push("/dashboard/vitals")} className={`${btnBase} bg-[#7a004b] text-white hover:bg-[#5c0037]`}><ClipboardList size={18} /> Enter Vitals</button>
          <button onClick={() => planUnlocked && router.push("/dashboard/plan")} disabled={!planUnlocked} className={`${btnBase} border border-[#7a004b33] bg-white text-[#7a004b] hover:bg-[#ffd2ea] disabled:opacity-50 disabled:cursor-not-allowed`}><Activity size={18} /> View Plan</button>
        </div>
      </main>

      {/* BOTTOM TASK BAR (unchanged) */}
      <nav className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[min(640px,92%)] rounded-full border border-[#7a004b1a] bg-white/70 backdrop-blur-md shadow-lg">
        <ul className="grid grid-cols-4">
          {[
            { label: "Home", icon: <House size={18} />, href: "/dashboard" },
            { label: "Vitals", icon: <ClipboardList size={18} />, href: "/dashboard/vitals" },
            { label: "Plan", icon: <Activity size={18} />, href: planUnlocked ? "/dashboard/plan" : undefined },
            { label: "Profile", icon: <UserRound size={18} />, href: "/settings" },
          ].map((item) => (
            <li key={item.label}>
              <button onClick={() => item.href && router.push(item.href)} className={`flex w-full items-center justify-center gap-2 py-3 text-sm ${item.href ? "hover:bg-[#7a004b0a]" : "opacity-50 cursor-not-allowed"} transition-colors rounded-full`}>
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
<AnimatePresence>
{showToday && (
  <TodayVitalsDialog
    open={showToday}
    onClose={() => setShowToday(false)}
  />
)}
</AnimatePresence>

      {/* --- NEW: Reminders Modal (big) --- */}
      <AnimatePresence>
        {showReminderModal && (
          <motion.div key="rem-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-pink-100/50 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowReminderModal(false)}>
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.98, y: 8, opacity: 0 }} transition={{ type: "spring", stiffness: 220, damping: 22 }} className="w-full max-w-2xl rounded-3xl bg-white text-[#4a0034] shadow-2xl border border-[#7a004b1a]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#7a004b12]">
                <h3 className={`${lexendTera.className} text-xl`}>Add reminder</h3>
                <button onClick={() => setShowReminderModal(false)} className="p-2 rounded-full hover:bg-[#7a004b0a]"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">Write a short reminder (e.g., "Check glucose before breakfast").</p>
                <textarea value={newReminderText} onChange={(e) => setNewReminderText(e.target.value)} rows={4} className="w-full p-3 border rounded-xl" placeholder="Add your reminder..." />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowReminderModal(false)} className="rounded-full px-4 py-2 border border-[#7a004b2a]">Cancel</button>
                  <button onClick={handleAddReminder} disabled={reminderSaving} className={`rounded-full px-6 py-2 bg-[#7a004b] text-white ${reminderSaving ? "opacity-60" : ""}`}>{reminderSaving ? "Saving…" : "Save reminder"}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}