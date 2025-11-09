// app/dashboard/plan/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Lexend } from "next/font/google";
import Loader from "@/components/Loader";
import { format, addDays, parseISO } from "date-fns";

const lexend = Lexend({ subsets: ["latin"], weight: ["400","500"], display: "swap" });

function weekRangeLabel(startIso: string) {
  const start = parseISO(startIso);
  const end = addDays(start, 6);
  return `${format(start,"MMM d")} - ${format(end,"MMM d")}`;
}

export default function PlanViewer() {
  const [user, setUser] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=> {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { setUser(null); setLoading(false); return; }
      setUser(u);
      // fetch meta plan
      try {
        const ref = doc(db, "users", u.uid, "meta", "plan");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setPlan(data.plan ?? data);
        } else {
          setPlan(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  },[]);

  if (loading) return <div className={`${lexend.className} min-h-screen flex items-center justify-center`}><Loader /></div>;

  if (!plan) return (
    <div className={`${lexend.className} min-h-screen flex items-center justify-center`}>
      <div className="text-center">
        <h2 className="text-lg font-medium">No plan generated yet</h2>
        <p className="text-sm text-slate-500">Generate a plan from the Vitals page.</p>
      </div>
    </div>
  );

  const weekStart = plan.weekStart ?? (new Date()).toISOString().slice(0,10);
  return (
    <div className={`${lexend.className} min-h-screen p-8 bg-transparent`}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Week of {weekRangeLabel(weekStart)}</h1>
        <p className="text-sm text-slate-600 mb-6">{plan.summary ?? ""}</p>

        <div className="space-y-4">
          {Array.isArray(plan.dayPlans) ? plan.dayPlans.map((d:any, idx:number) => (
            <details key={idx} className="bg-white/95 p-4 rounded-lg border border-slate-200 shadow-sm">
              <summary className="font-medium">{d.day}</summary>
              <div className="mt-2 text-sm text-slate-700">
                <div><strong>Diet</strong><ul className="list-disc ml-5">{d.diet?.map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></div>
                <div className="mt-2"><strong>Exercise</strong><ul className="list-disc ml-5">{d.exercise?.map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></div>
                <div className="mt-2"><strong>Wellness</strong><ul className="list-disc ml-5">{d.wellness?.map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></div>
              </div>
            </details>
          )) : (
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <pre className="whitespace-pre-wrap text-sm">{typeof plan === "string" ? plan : JSON.stringify(plan, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
