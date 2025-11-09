// app/dashboard/vitals/page.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { Lexend } from "next/font/google";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { format, startOfWeek, addDays } from "date-fns";
import Loader from "@/components/Loader";

const lexend = Lexend({ subsets: ["latin"], weight: ["400","500"], display: "swap" });

type ViewMode = "month" | "week" | "day";

export default function VitalsCalendar() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [vitalsMap, setVitalsMap] = useState<Record<string, any>>({});
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState<any>({ glucose:"", insulin:"", carbs:"", weight:"", steps:"", mood:"", notes:"" });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(()=> {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { setUser(null); return; }
      setUser(u);
    });
    return () => unsub();
  },[]);

  // load vitals for current user
  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDocs(collection(db, "users", user.uid, "vitals"));
      const map: Record<string, any> = {};
      snap.forEach(d => map[d.id] = d.data());
      setVitalsMap(map);
    })();
  }, [user]);

  const todayIso = (d=new Date()) => d.toISOString().slice(0,10);

  // compute grid dates for month view
  const monthGrid = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const last = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0);
    const out: Array<Date | null> = [];
    const pad = first.getDay();
    for (let i=0;i<pad;i++) out.push(null);
    for (let d=1; d<= last.getDate(); d++) out.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewDate]);

  // week view dates (Mon-Sun)
  const weekDates = useMemo(() => {
    const start = startOfWeek(viewDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_,i)=> addDays(start,i));
  }, [viewDate]);

  function openModalFor(dateIso: string) {
    setSelectedISO(dateIso);
    const existing = vitalsMap[dateIso];
    setEntryForm({
      glucose: existing?.glucose ?? "",
      insulin: existing?.insulin ?? "",
      carbs: existing?.carbs ?? "",
      weight: existing?.weight ?? "",
      steps: existing?.steps ?? "",
      mood: existing?.mood ?? "",
      notes: existing?.notes ?? ""
    });
  }

  async function saveEntry() {
    if (!user || !selectedISO) return;
    if (!entryForm.glucose || String(entryForm.glucose).trim() === "") {
      setToast("Glucose is required.");
      return;
    }
    setSaving(true);
    try {
      const ref = doc(db, "users", user.uid, "vitals", selectedISO);
      await setDoc(ref, { date: selectedISO, ...entryForm, updatedAt: Date.now() }, { merge: true });
      setVitalsMap(s => ({ ...s, [selectedISO]: { date: selectedISO, ...entryForm } }));
      setSelectedISO(null);
      setToast("Saved vitals.");
    } catch (e) {
      console.error(e);
      setToast("Failed to save.");
    } finally {
      setSaving(false);
      setTimeout(()=>setToast(null), 2700);
    }
  }

  // navigation and generate plan flow
  function changeMonth(offset:number) {
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + offset, 1));
  }
  function changeWeek(offset:number) {
    setViewDate(d => addDays(d, offset*7));
  }
  function changeDay(offset:number) {
    setViewDate(d => addDays(d, offset));
  }

  async function handleGenerateAndRoute() {
    if (!user) { setToast("Sign in to generate a plan"); return; }
    setGenerating(true);
    try {
      const idToken = await user.getIdToken();
      // call server endpoint
      const res = await fetch("/api/plan", { method: "POST", headers: { Authorization: `Bearer ${idToken}` }});
      const json = await res.json();
      if (!res.ok) {
        setToast("Failed to generate. Using fallback.");
      } else {
        setToast("Plan generated.");
      }
      // route to plan page and let plan page read the stored plan
      router.push("/dashboard/plan");
    } catch (e) {
      console.error(e);
      setToast("Network error.");
    } finally {
      setGenerating(false);
      setTimeout(()=>setToast(null), 2000);
    }
  }

  return (
    <div className={`${lexend.className} min-h-screen relative bg-transparent px-6 py-12`}>
      {/* orbs */}
      <div className="pointer-events-none absolute inset-0 -z-20">
        <div className="absolute -left-56 -top-56 w-[640px] h-[640px] rounded-full filter blur-3xl opacity-70" style={{ background: "radial-gradient(circle at 25% 30%, rgba(255,200,230,0.6), rgba(200,150,255,0.22), transparent 60%)" }} />
        <div className="absolute -right-56 -bottom-56 w-[640px] h-[640px] rounded-full filter blur-3xl opacity-70" style={{ background: "radial-gradient(circle at 70% 70%, rgba(200,230,255,0.6), rgba(255,220,200,0.22), transparent 60%)" }} />
      </div>

      <main className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold">Vitals</h1>
            <div className="text-sm text-slate-600">Minimal calendar — Lexend numbers, light grid.</div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex gap-3 text-sm">
              <button className="font-medium hover:underline" onClick={() => setViewMode("month")}>Month</button>
              <button className="font-medium hover:underline" onClick={() => setViewMode("week")}>Week</button>
              <button className="font-medium hover:underline" onClick={() => setViewMode("day")}>Day</button>
            </nav>

            <div className="text-sm text-slate-600"> {/* text-only style */}
              <button className="font-medium hover:underline" onClick={() => handleGenerateAndRoute()} disabled={generating}>
                {generating ? "Generating…" : "Generate My Plan"}
              </button>
            </div>
          </div>
        </div>

        {/* calendar content */}
        {viewMode === "month" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">{viewDate.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
              <div className="flex gap-2">
                <button className="text-sm hover:underline" onClick={() => changeMonth(-1)}>‹ Prev</button>
                <button className="text-sm hover:underline" onClick={() => changeMonth(1)}>Next ›</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-xs text-slate-500 mb-2">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="text-center">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthGrid.map((maybeDate, i) => {
                if (!maybeDate) return <div key={i} className="h-20 rounded-lg bg-transparent" />;
                const iso = maybeDate.toISOString().slice(0,10);
                const logged = !!vitalsMap[iso];
                const isToday = iso === new Date().toISOString().slice(0,10);
                return (
                  <motion.button
                    key={iso}
                    onClick={() => openModalFor(iso)}
                    whileHover={{ scale: 1.02 }}
                    className={`h-20 p-3 text-left rounded-lg border border-transparent ${logged ? "bg-white/90 border-slate-200 shadow-sm" : "bg-white/40"} ${isToday ? "ring-1 ring-[#ffd2ea]" : ""}`}
                  >
                    <div className="text-sm font-medium text-slate-700">{maybeDate.getDate()}</div>
                    <div className="text-xs text-slate-400 mt-2">{logged ? "Logged" : ""}</div>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}

        {viewMode === "week" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Week of {format(startOfWeek(viewDate, {weekStartsOn:1}), "MMM d")}</div>
              <div className="flex gap-2">
                <button className="text-sm hover:underline" onClick={() => changeWeek(-1)}>‹ Prev</button>
                <button className="text-sm hover:underline" onClick={() => changeWeek(1)}>Next ›</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDates.map(d => {
                const iso = d.toISOString().slice(0,10);
                const logged = !!vitalsMap[iso];
                const isToday = iso === new Date().toISOString().slice(0,10);
                return (
                  <motion.button key={iso} onClick={() => openModalFor(iso)} whileHover={{ scale:1.02 }} className={`h-28 p-3 text-left rounded-lg border ${logged ? "bg-white/95 border-slate-200 shadow-sm" : "bg-white/40" } ${isToday ? "ring-1 ring-[#ffd2ea]" : ""}`}>
                    <div className="text-sm font-medium">{format(d,"EEE dd")}</div>
                    <div className="text-xs text-slate-400 mt-2">{logged ? "Logged" : "No data"}</div>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}

        {viewMode === "day" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">{format(viewDate,"EEEE, MMM d")}</div>
              <div className="flex gap-2">
                <button className="text-sm hover:underline" onClick={() => changeDay(-1)}>‹ Prev</button>
                <button className="text-sm hover:underline" onClick={() => changeDay(1)}>Next ›</button>
              </div>
            </div>

            <div className="bg-white/90 p-4 rounded-lg border border-slate-200 shadow-sm">
              <div className="text-sm font-medium mb-2">Day details</div>
              <div className="text-sm text-slate-600">{vitalsMap[viewDate.toISOString().slice(0,10)] ? JSON.stringify(vitalsMap[viewDate.toISOString().slice(0,10)]) : "No data logged"}</div>
            </div>
          </>
        )}
      </main>

      {/* modal */}
      {selectedISO && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedISO(null)}>
          <motion.div onClick={e=>e.stopPropagation()} initial={{ scale:0.98, opacity:0 }} animate={{ scale:1, opacity:1 }} className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">{selectedISO}</h3>
                <div className="text-sm text-slate-500">Enter vitals for this date</div>
              </div>
              <button className="text-sm hover:underline" onClick={()=> setSelectedISO(null)}>Close</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={entryForm.glucose} onChange={e=>setEntryForm(s=>({...s, glucose:e.target.value}))} placeholder="Glucose (mg/dL)" className="p-2 border rounded" />
              <input type="number" value={entryForm.insulin} onChange={e=>setEntryForm(s=>({...s, insulin:e.target.value}))} placeholder="Insulin (U)" className="p-2 border rounded" />
              <input type="number" value={entryForm.carbs} onChange={e=>setEntryForm(s=>({...s, carbs:e.target.value}))} placeholder="Carbs (g)" className="p-2 border rounded" />
              <input type="number" value={entryForm.weight} onChange={e=>setEntryForm(s=>({...s, weight:e.target.value}))} placeholder="Weight (kg)" className="p-2 border rounded" />
              <input type="number" value={entryForm.steps} onChange={e=>setEntryForm(s=>({...s, steps:e.target.value}))} placeholder="Steps" className="p-2 border rounded" />
              <input type="text" value={entryForm.mood} onChange={e=>setEntryForm(s=>({...s, mood:e.target.value}))} placeholder="Mood" className="p-2 border rounded" />
            </div>

            <textarea value={entryForm.notes} onChange={e=>setEntryForm(s=>({...s, notes:e.target.value}))} placeholder="Notes" className="w-full mt-3 p-2 border rounded" rows={3} />

            <div className="flex justify-end gap-3 mt-4">
              <button className="text-sm hover:underline" onClick={()=> setSelectedISO(null)}>Cancel</button>
              <button className="text-sm font-medium hover:underline" onClick={saveEntry} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* toast */}
      {toast && <div className="fixed bottom-8 right-8 bg-white/95 border p-3 rounded shadow text-sm">{toast}</div>}
    </div>
  );
}
