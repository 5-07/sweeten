"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lexend, Lexend_Tera } from "next/font/google";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getDoc, setDoc, doc, collection, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  Activity,
  ClipboardList,
  House,
  LineChart,
  LogOut,
  UserRound,
  X,
  Bell,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";

const lexend = Lexend({ subsets: ["latin"], weight: ["400", "500"] });
const lexendTera = Lexend_Tera({ subsets: ["latin"], weight: ["700"] });

// Pastel card colors inspired by your refs (kept same)
const PASTELS = [
  "bg-[#fde7f2] text-[#7a004b]",
  "bg-[#fff3b0] text-[#4a0034]",
  "bg-[#eedbff] text-[#4a0034]",
  "bg-[#dff7f2] text-[#4a0034]",
];

// Cute moods row (kept)
const MOODS = ["😄", "🙂", "😐", "🙁", "😫"] as const;

type VitalEntry = {
  date: string;
  glucose: number | null | string;
  insulinUnits: number | null | string;
  carbs: number | null | string;
  steps: number | null | string;
  mood: string;
  notes: string;
  updatedAt?: number;
};

type Reminder = {
  id: string;
  text: string;
  createdAt: number;
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<{ username?: string; photoURL?: string } | null>(null);
  const [vitals, setVitals] = useState<VitalEntry[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Modal state for "Today" quick entry (unchanged)
  const [showToday, setShowToday] = useState(false);
  const [saving, setSaving] = useState(false);
  const [todayForm, setTodayForm] = useState<VitalEntry>({
    date: isoToday(),
    glucose: "",
    insulinUnits: "",
    carbs: "",
    steps: "",
    mood: "",
    notes: "",
  });

  // --- NEW: reminders state & modal ---
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newReminderText, setNewReminderText] = useState("");
  const [reminderSaving, setReminderSaving] = useState(false);

  // --- Plan preview state (plain text) ---
  const [planPreview, setPlanPreview] = useState<string | null>(null);

  // --- auth gate + initial data load (kept as-is except we also load reminders + plan) ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/signin");
        return;
      }
      setUser(u);

      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        const data: any = snap.data();
        setProfile({
          username: data.username || u.displayName || undefined,
          photoURL: data.photoURL || u.photoURL || undefined,
        });
        setVitals(Array.isArray(data.vitals) ? (data.vitals as VitalEntry[]) : []);

        // load reminders from a subcollection `users/{uid}/reminders`
        try {
          const remSnap = await getDocs(collection(db, "users", u.uid, "reminders"));
          const rems: Reminder[] = [];
          remSnap.forEach((d) => {
            const r = d.data() as any;
            rems.push({
              id: d.id,
              text: r.text,
              createdAt: r.createdAt ?? Date.now(),
            });
          });
          // keep original order
          setReminders(rems);
        } catch (e) {
          console.error("Failed to load reminders", e);
        }

        // load plan preview from meta doc (we store plan as plain text at users/{uid}/meta/plan -> field `plan`)
        try {
          const planDoc = await getDoc(doc(db, "users", u.uid, "meta", "plan"));
          if (planDoc.exists()) {
            const pd = planDoc.data();
            // handle a few possible shapes: plain string, { plan: string }, or object
            let text: string | null = null;
            if (typeof pd === "string") text = pd as any;
            else if (pd?.plan && typeof pd.plan === "string") text = pd.plan;
            else if (pd?.plan && typeof pd.plan === "object") {
              // if structured, stringify a bit
              text = JSON.stringify(pd.plan).slice(0, 600);
            } else if (pd?.text && typeof pd.text === "string") text = pd.text;
            else text = null;
            setPlanPreview(text);
          } else {
            setPlanPreview(null);
          }
        } catch (e) {
          console.error("Failed to load plan preview", e);
        }
      } else {
        await setDoc(doc(db, "users", u.uid), { createdAt: Date.now() }, { merge: true });
      }
    });

    return () => unsub();
  }, [router]);

  // When modal opens, prefill with any existing record for today (unchanged)
  useEffect(() => {
    if (!showToday) return;
    const t = isoToday();
    const existing = (vitals || []).find((v) => v?.date === t);
    setTodayForm({
      date: t,
      glucose: (existing?.glucose ?? "") as any,
      insulinUnits: (existing?.insulinUnits ?? "") as any,
      carbs: (existing?.carbs ?? "") as any,
      steps: (existing?.steps ?? "") as any,
      mood: existing?.mood ?? "",
      notes: existing?.notes ?? "",
      updatedAt: existing?.updatedAt,
    });
  }, [showToday, vitals]);

  // Count a day as filled if any field has a non-empty value
  const filledDays = useMemo(() => {
    if (!Array.isArray(vitals)) return 0;
    return vitals.filter((d) => d && Object.values(d).some((v) => String(v ?? "").trim().length > 0)).length;
  }, [vitals]);

  const planUnlocked = filledDays >= 7;

  // cute button base (header + CTA reuse) — kept as in your original
  const btnBase = "inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition-all duration-300 will-change-transform hover:-translate-y-0.5 hover:shadow-xl";

  async function saveTodayToFirestore() {
    if (!user) return;
    setSaving(true);
    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      const current: VitalEntry[] = snap.exists() && Array.isArray((snap.data() as any).vitals) ? ((snap.data() as any).vitals as VitalEntry[]) : [];

      const cleaned: VitalEntry = {
        date: todayForm.date || isoToday(),
        glucose: todayForm.glucose === "" ? null : Number(todayForm.glucose as any),
        insulinUnits: todayForm.insulinUnits === "" ? null : Number(todayForm.insulinUnits as any),
        carbs: todayForm.carbs === "" ? null : Number(todayForm.carbs as any),
        steps: todayForm.steps === "" ? null : Number(todayForm.steps as any),
        mood: todayForm.mood || "",
        notes: todayForm.notes || "",
        updatedAt: Date.now(),
      };

      // Replace today's entry or append, then keep only last 7
      let next = [...current];
      const idx = next.findIndex((v) => v?.date === cleaned.date);
      if (idx >= 0) next[idx] = { ...next[idx], ...cleaned };
      else next.push(cleaned);
      next = next.slice(-7);

      await setDoc(ref, { vitals: next }, { merge: true });
      setVitals(next);
      setShowToday(false);
    } finally {
      setSaving(false);
    }
  }

  // --- Reminders functions (Firestore-backed) ---
  async function openAddReminderModal() {
    setNewReminderText("");
    setShowReminderModal(true);
  }

  async function handleAddReminder() {
    if (!user || !newReminderText.trim()) return;
    setReminderSaving(true);
    try {
      const colRef = collection(db, "users", user.uid, "reminders");
      // create firestore doc
      const docRef = await addDoc(colRef, { text: newReminderText.trim(), createdAt: Date.now() });
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

  // Compute vitals summary: pick latest entry (last element of vitals array)
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
                <div className="text-2xl font-semibold mt-2">{latestVitals?.glucose ?? "—"}</div>
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

      {/* TODAY QUICK ENTRY MODAL (kept intact) */}
      <AnimatePresence>
        {showToday && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-pink-100/50 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowToday(false)}>
            <motion.div key="card" initial={{ scale: 0.95, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.98, y: 8, opacity: 0 }} transition={{ type: "spring", stiffness: 220, damping: 22 }} className="w-full max-w-3xl md:max-w-4xl h-[90vh] overflow-y-auto rounded-3xl bg-white text-[#4a0034] shadow-2xl border border-[#7a004b1a]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#7a004b12] sticky top-0 bg-white z-10">
                <h3 className={`${lexendTera.className} text-xl`}>Log today’s vitals</h3>
                <button onClick={() => setShowToday(false)} className="p-2 rounded-full hover:bg-[#7a004b0a]"><X size={18} /></button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Use your original form fields here — unchanged visually */}
                <div className="grid grid-cols-2 gap-4">
                  <label className="text-sm">
                    <span className="block mb-1">Date</span>
                    <input type="date" value={todayForm.date} readOnly className="w-full rounded-xl border border-[#7a004b2a] px-3 py-2 bg-gray-50" />
                  </label>
                  <label className="text-sm">
                    <span className="block mb-1">Glucose (mg/dL)</span>
                    <input type="number" inputMode="numeric" value={todayForm.glucose as any} onChange={(e) => setTodayForm((s: any) => ({ ...s, glucose: e.target.value }))} className="w-full rounded-xl border border-[#7a004b2a] px-3 py-2 outline-none focus:ring-2 focus:ring-[#7a004b]" />
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <label className="text-sm">
                    <span className="block mb-1">Insulin (U)</span>
                    <input type="number" inputMode="numeric" value={todayForm.insulinUnits as any} onChange={(e) => setTodayForm((s: any) => ({ ...s, insulinUnits: e.target.value }))} className="w-full rounded-xl border border-[#7a004b2a] px-3 py-2 outline-none focus:ring-2 focus:ring-[#7a004b]" />
                  </label>
                  <label className="text-sm">
                    <span className="block mb-1">Carbs (g)</span>
                    <input type="number" inputMode="numeric" value={todayForm.carbs as any} onChange={(e) => setTodayForm((s: any) => ({ ...s, carbs: e.target.value }))} className="w-full rounded-xl border border-[#7a004b2a] px-3 py-2 outline-none focus:ring-2 focus:ring-[#7a004b]" />
                  </label>
                  <label className="text-sm">
                    <span className="block mb-1">Steps</span>
                    <input type="number" inputMode="numeric" value={todayForm.steps as any} onChange={(e) => setTodayForm((s: any) => ({ ...s, steps: e.target.value }))} className="w-full rounded-xl border border-[#7a004b2a] px-3 py-2 outline-none focus:ring-2 focus:ring-[#7a004b]" />
                  </label>
                </div>

                <div>
                  <span className="block mb-1 text-sm">Mood</span>
                  <div className="flex items-center gap-2">
                    {MOODS.map((m) => (
                      <button key={m} onClick={() => setTodayForm((s: any) => ({ ...s, mood: m }))} className={`h-10 w-10 rounded-full border text-lg flex items-center justify-center transition ${todayForm.mood === m ? "bg-[#ffd2ea] border-[#7a004b]" : "border-[#7a004b2a] hover:bg-[#7a004b0a]"}`}>{m}</button>
                    ))}
                  </div>
                </div>

                <label className="text-sm block">
                  <span className="block mb-1">Notes</span>
                  <textarea value={todayForm.notes} onChange={(e) => setTodayForm((s: any) => ({ ...s, notes: e.target.value }))} rows={3} className="w-full rounded-xl border border-[#7a004b2a] px-3 py-2 outline-none focus:ring-2 focus:ring-[#7a004b]" placeholder="Anything worth remembering about today…" />
                </label>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button onClick={() => setShowToday(false)} className="rounded-full px-5 py-2 border border-[#7a004b2a] hover:bg-[#7a004b0a]">Cancel</button>
                  <button onClick={saveTodayToFirestore} disabled={saving} className={`rounded-full px-6 py-2 bg-[#7a004b] text-white hover:bg-[#5c0037] transition ${saving ? "opacity-60" : ""}`}>{saving ? "Saving…" : "Save"}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
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
