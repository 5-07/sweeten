// app/dashboard/vitals/page.tsx 
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Lexend } from "next/font/google";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { format, startOfWeek, addDays, getDay } from "date-fns";
import Loader from "@/components/Loader";
// 🛑 Import all utilities and types from the new file
import { fetchAllVitals, VitalsEntry, saveVitalsEntry, getAuthToken, VitalsForPlan } from "@/lib/vitals";

const lexend = Lexend({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });

type ViewMode = "month" | "week" | "day";

type EntryFormState = {
  bloodSugar: number | "";
  insulinUnits: number | "";
  carbs: number | "";
  weight: number | "";
  sys: number | "";
  dia: number | "";
  steps: number | "";
  mood: string;
  notes: string;
};


export default function VitalsCalendar() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("week"); // Default to week view
  const [viewDate, setViewDate] = useState<Date>(new Date());
  // 🛑 Now a map of VitalsEntry objects, keyed by date string
  const [vitalsMap, setVitalsMap] = useState<Record<string, VitalsEntry>>({});
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
  // 🛑 All fields defined, using correct 'bloodSugar' and 'insulinUnits'
const [entryForm, setEntryForm] = useState<EntryFormState>({
  bloodSugar: "",
  insulinUnits: "",
  carbs: "",
  weight: "",
  sys: "",
  dia: "",
  steps: "",
  mood: "",
  notes: ""
});

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Listen for auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/signin");
        return;
      }
      setUser(u);
      loadVitals(u.uid);
    });
    return () => unsub();
  }, [router]);

  // Load vitals utility function
  const loadVitals = async (uid: string) => {
    const vitalsList = await fetchAllVitals(uid);
    const map: Record<string, VitalsEntry> = {};
    vitalsList.forEach(v => map[v.id] = v);
    setVitalsMap(map);
  };

  const todayIso = (d = new Date()) => d.toISOString().slice(0, 10);

  // Month grid
  const monthGrid = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const last = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const out: Array<Date | null> = [];
    const startDay = getDay(first); // 0 = Sunday, 1 = Monday
    const pad = startDay === 0 ? 6 : startDay - 1; // Pad based on Monday start

    for (let i = 0; i < pad; i++) out.push(null);
    for (let d = 1; d <= last.getDate(); d++) out.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewDate]);

  // Week dates
  const weekDates = useMemo(() => {
    const start = startOfWeek(viewDate, { weekStartsOn: 1 }); // Starts on Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [viewDate]);

  function openModalFor(dateIso: string) {
    setSelectedISO(dateIso);
    const existing = vitalsMap[dateIso];
    // 🛑 Map fields from VitalsEntry to form state
    setEntryForm({
      bloodSugar: existing?.bloodSugar ?? "",
      insulinUnits: existing?.insulinUnits ?? "",
      carbs: existing?.carbs ?? "",
      weight: existing?.weight ?? "",
      sys: existing?.bloodPressure?.sys ?? "",
      dia: existing?.bloodPressure?.dia ?? "",
      steps: existing?.steps ?? "",
      mood: existing?.mood ?? "",
      notes: existing?.notes ?? ""
    });
  }

  async function saveEntry() {
    if (!user || !selectedISO) return;
    if (!entryForm.bloodSugar || String(entryForm.bloodSugar).trim() === "") {
      setToast("Blood Sugar is required.");
      setTimeout(() => setToast(null), 2700);
      return;
    }
    setSaving(true);
    try {
      // 🛑 Use the new utility function
      await saveVitalsEntry(user.uid, selectedISO, {
        bloodSugar: entryForm.bloodSugar ? Number(entryForm.bloodSugar) : null,
        insulinUnits: entryForm.insulinUnits ? Number(entryForm.insulinUnits) : null,
        carbs: entryForm.carbs ? Number(entryForm.carbs) : null,
        weight: entryForm.weight ? Number(entryForm.weight) : null,
        bloodPressure: {
          sys: entryForm.sys ? Number(entryForm.sys) : null,
          dia: entryForm.dia ? Number(entryForm.dia) : null,
        },
        steps: entryForm.steps ? Number(entryForm.steps) : null,
        mood: entryForm.mood || "",
        notes: entryForm.notes || null,
      });

      // Refresh the map state optimistically
      setVitalsMap(s => ({ 
        ...s, 
        [selectedISO]: { 
          // NOTE: This is an optimistic update. In a real app, you might want 
          // to refetch or ensure the structure matches VitalsEntry fully.
          ...s[selectedISO], 
          ...entryForm, 
          date: selectedISO, 
          id: selectedISO 
        } as VitalsEntry // Type assertion for safety
      }));

      setSelectedISO(null);
      setToast("Saved vitals.");
    } catch (e) {
      console.error(e);
      setToast("Failed to save.");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 2700);
    }
  }

  // Navigation helpers
  function changeMonth(offset: number) {
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + offset, 1));
  }
  function changeWeek(offset: number) {
    setViewDate(d => addDays(d, offset * 7));
  }
  function changeDay(offset: number) {
    setViewDate(d => addDays(d, offset));
  }

  // 🛑 COMPLETED function for secure plan generation
  async function handleGenerateAndRoute() {
    if (!user) {
      setToast("Sign in to generate a plan.");
      return;
    }

    // 1. Filter Vitals: Get the last 7 non-null vitals entries for the AI
    const allVitals: VitalsEntry[] = Object.values(vitalsMap).sort((a, b) => b.date.localeCompare(a.date));
  const vitalsForPlan: VitalsForPlan[] = Object.values(vitalsMap)
  .filter(v => v.bloodSugar !== null)
  .slice(-7) // last 7 days
  .map(v => ({
    date: v.date,
    bloodSugar: v.bloodSugar!,
    bloodPressure: v.bloodPressure,
    weight: v.weight,
    insulinUnits: v.insulinUnits,
    carbs: v.carbs,
    steps: v.steps,
    mood: v.mood,
    notes: v.notes,
  }));

      
    if (vitalsForPlan.length < 7) {
      setToast(`Need ${7 - vitalsForPlan.length} more days with Blood Sugar recorded.`);
      return;
    }

    setGenerating(true);
    setToast("Generating your personalized plan...");

    try {
      // 2. Get secure token for API call
      const token = await getAuthToken(user);
      
      // 3. Call the Next.js API route securely
      // API route now fetches vitals from DB, but we can still send them for backward compatibility
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // Pass JWT for server-side auth
        },
        // Body is optional - API will fetch from DB if not provided
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Plan generation failed on the server.");
      }

      // Plan saved in database by API route. Route user to the plan page.
      setToast("✅ Plan generated successfully!");
      router.push("/dashboard/plan");
    } catch (e: any) {
      console.error("Generation error:", e);
      setToast(e.message || "Failed to generate plan. Please try again.");
    } finally {
      setGenerating(false);
      setTimeout(() => setToast(null), 2700);
    }
  }

  const sortedVitals = Object.values(vitalsMap).sort((a, b) => b.date.localeCompare(a.date));
  const filledDays = sortedVitals.filter(v => v.bloodSugar !== null).slice(0, 7).length;
  const planUnlocked = filledDays >= 7;


  return (
    <div className={`${lexend.className} min-h-screen bg-[#f8f6f8] text-[#4a0034]`}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold mb-8">
          Vitals Log & Plan
        </motion.h1>

        {/* Top Controls and Plan CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 rounded-xl bg-white shadow-md border border-[#7a004b12]">
          <div className="flex items-center gap-3">
            <span className="font-semibold">View:</span>
            <button onClick={() => setViewMode("month")} className={`px-3 py-1 rounded-full text-sm ${viewMode === 'month' ? 'bg-[#7a004b] text-white' : 'border border-[#7a004b2a]'}`}>Month</button>
            <button onClick={() => setViewMode("week")} className={`px-3 py-1 rounded-full text-sm ${viewMode === 'week' ? 'bg-[#7a004b] text-white' : 'border border-[#7a004b2a]'}`}>Week</button>
          </div>

          <button 
            onClick={handleGenerateAndRoute}
            disabled={!planUnlocked || generating}
            className={`rounded-full px-6 py-2 font-semibold text-sm transition ${planUnlocked && !generating ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
          >
            {generating ? <Loader label="Generating..." /> : planUnlocked ? "Generate Plan" : `Need ${7 - filledDays} days`}
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-xl p-6 bg-white shadow-xl border border-[#7a004b12]">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{viewMode === 'month' ? format(viewDate, "MMMM yyyy") : format(startOfWeek(viewDate, { weekStartsOn: 1 }), "MMM d")} - {viewMode === 'month' ? "" : format(addDays(startOfWeek(viewDate, { weekStartsOn: 1 }), 6), "MMM d, yyyy")}</h2>
            <div className="flex gap-2">
              <button onClick={() => viewMode === 'month' ? changeMonth(-1) : changeWeek(-1)} className="p-2 rounded-full hover:bg-gray-100">{'<'}</button>
              <button onClick={() => viewMode === 'month' ? changeMonth(1) : changeWeek(1)} className="p-2 rounded-full hover:bg-gray-100">{'>'}</button>
            </div>
          </div>

          {/* Day Headers (Monday to Sunday) */}
          <div className="grid grid-cols-7 text-center font-medium text-sm text-gray-500 border-b pb-2 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1">
            {(viewMode === 'month' ? monthGrid : weekDates).map((date, i) => {
              if (!date) return <div key={i} className="aspect-square"></div>;

              const iso = date.toISOString().slice(0, 10);
              const entry = vitalsMap[iso];
              const isToday = iso === todayIso();
              const hasEntry = !!entry && entry.bloodSugar !== null;
              
             return (
                <button
                  key={iso}
                  onClick={() => openModalFor(iso)}
                  className={`aspect-square p-2 border rounded transition-colors flex flex-col items-center justify-center relative 
                    ${isToday ? 'border-pink-500 bg-pink-50' : 'hover:bg-gray-50'}
                    ${hasEntry ? 'bg-[#7a004b12] hover:bg-[#7a004b2a]' : 'bg-white'}`}
                >
                  <span className="text-xl font-bold">{date.getDate()}</span>
                  {hasEntry && <span className="text-xs text-green-700 mt-1">Logged</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day/Week view details (Simplified versions) */}
        {viewMode === "day" && (
          <div className="mt-8 p-4 rounded-xl bg-white shadow-md border border-[#7a004b12]">
            <h3 className="text-lg font-bold mb-2">{format(viewDate, "EEEE, MMM d, yyyy")} Details</h3>
            <p className="text-sm text-gray-600">
              {vitalsMap[viewDate.toISOString().slice(0, 10)] ? JSON.stringify(vitalsMap[viewDate.toISOString().slice(0, 10)], null, 2) : "No data logged for this day."}
            </p>
          </div>
        )}
        {viewMode === "week" && (
          <div className="mt-8 p-4 rounded-xl bg-white shadow-md border border-[#7a004b12]">
            <h3 className="text-lg font-bold mb-2">Weekly Summary (Last 7 days)</h3>
            <p className="text-sm text-gray-600">Days logged with Blood Sugar: {filledDays} / 7</p>
          </div>
        )}


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
                {/* 🐛 FIX: Use bloodSugar and insulinUnits */}
                <input type="number" value={entryForm.bloodSugar} onChange={e=>setEntryForm(s=>({...s, bloodSugar:e.target.value === "" ? "" : Number(e.target.value),}))} placeholder="Blood Sugar (mg/dL)" className="p-2 border rounded" />
                <input type="number" value={entryForm.insulinUnits} onChange={e=>setEntryForm(s=>({...s, insulinUnits:e.target.value === "" ? "" : Number(e.target.value),}))} placeholder="Insulin (U)" className="p-2 border rounded" />
                <input type="number" value={entryForm.carbs} onChange={e=>setEntryForm(s=>({...s, carbs:e.target.value === "" ? "" : Number(e.target.value),}))} placeholder="Carbs (g)" className="p-2 border rounded" />
                <input type="number" value={entryForm.weight} onChange={e=>setEntryForm(s=>({...s, weight:e.target.value === "" ? "" : Number(e.target.value),}))} placeholder="Weight (kg)" className="p-2 border rounded" />
                <input type="number" value={entryForm.sys} onChange={e=>setEntryForm(s=>({...s, sys:e.target.value === "" ? "" : Number(e.target.value),}))} placeholder="BP Systolic" className="p-2 border rounded" />
                <input type="number" value={entryForm.dia} onChange={e=>setEntryForm(s=>({...s, dia:e.target.value === "" ? "" : Number(e.target.value),}))} placeholder="BP Diastolic" className="p-2 border rounded" />
                <input type="number" value={entryForm.steps} onChange={e=>setEntryForm(s=>({...s, steps:e.target.value === "" ? "" : Number(e.target.value),}))} placeholder="Steps" className="p-2 border rounded" />
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
    </div>
  );
}