// app/dashboard/plan/page.tsx (NEW)

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lexend, Lexend_Tera } from "next/font/google";
import { ArrowLeft, CheckCircle2, FlaskConical, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import Loader from "@/components/Loader";
import { fetchUserPlan } from "@/lib/vitals";
import { generateFallbackPlan } from "@/lib/generateFallbackPlan";

const lexend = Lexend({ subsets: ["latin"], weight: ["400", "500"] });
const lexendTera = Lexend_Tera({ subsets: ["latin"], weight: ["700"] });

export default function PlanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/signin");
      return;
    }

    const loadPlan = async () => {
      setLoading(true);
      try {
        let planData = await fetchUserPlan(user.uid);
        
        // If planData is null or an error string, use the fallback structure
        if (!planData || typeof planData === 'string') {
            // A simple way to get a baseline plan when the generated one fails/is missing
            planData = generateFallbackPlan({ avgGlucose: null });
            planData.message = "No personalized plan found. Displaying fallback guidance.";
        }
        
        // Attempt to parse a structured plan if it's not plain text
        if (typeof planData === 'string' && planData.includes('{')) {
            try {
                // Gemini output may be JSON, try to parse it
                planData = JSON.parse(planData);
            } catch {
                // If parsing fails, wrap the string for easy rendering
                planData = { source: 'gemini', message: "Your personalized plan:", text: planData };
            }
        }
        
        setPlan(planData);
      } catch (e) {
        console.error("Failed to load plan", e);
        setPlan(generateFallbackPlan({ avgGlucose: null })); // Default to safe fallback
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [user, authLoading, router]);
  
  if (authLoading || loading) {
    return <div className="min-h-screen grid place-items-center"><Loader label="Loading your personalized plan..." /></div>;
  }

  // Determine if we have a detailed plan structure or just raw text
  const isStructured = plan && plan.dayPlans && Array.isArray(plan.dayPlans);
  
  return (
    <div className={`${lexend.className} min-h-screen bg-[#f8f6f8] text-[#4a0034]`}>
      <div className="mx-auto max-w-4xl px-6 py-10">
        <button onClick={() => router.back()} className="flex items-center gap-2 mb-8 text-sm text-[#7a004b] hover:text-[#5c0037]">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <h1 className={`${lexendTera.className} text-5xl text-[#7a004b] mb-4`}>
          My Weekly Plan
        </h1>
        
        <div className={`p-4 rounded-xl mb-8 ${plan.source === 'fallback' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
            <p className="font-semibold flex items-center gap-2">
                {plan.source === 'fallback' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                {plan.message}
            </p>
        </div>

        {/* Structured Daily Plan (from fallback or well-structured Gemini output) */}
        {isStructured ? (
          <div className="space-y-6">
            {plan.dayPlans.map((dayPlan: any) => (
              <div key={dayPlan.day} className="p-5 rounded-2xl bg-white shadow-lg border border-[#7a004b12]">
                <h2 className="text-2xl font-semibold mb-3">{dayPlan.day}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h3 className="font-bold mb-1 flex items-center gap-1">Dietary Focus</h3>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {dayPlan.diet?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1 flex items-center gap-1">Exercise Goal</h3>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {dayPlan.exercise?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1 flex items-center gap-1">Wellness Tip</h3>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {dayPlan.wellness?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
            // Raw text fallback (used when Gemini returns un-structured text)
            <div className="p-6 rounded-2xl bg-white shadow-lg border border-[#7a004b12] whitespace-pre-wrap">
                {plan.text || plan.plan || "Plan content is currently unavailable or malformed. Please try generating again from the Vitals page."}
            </div>
        )}

        <div className="mt-8 p-4 bg-red-100 text-red-800 rounded-lg flex items-start gap-2 text-sm">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
          <p>
            **Disclaimer:** This is an AI-generated plan and should not replace professional medical advice. Always consult your healthcare provider before making changes to your insulin dosage, diet, or exercise regimen.
          </p>
        </div>
      </div>
    </div>
  );
}