// app/dashboard/plan/page.tsx

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lexend, Lexend_Tera } from "next/font/google";
import { ArrowLeft, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import Loader from "@/components/Loader";
import { fetchUserPlan } from "@/lib/vitals";

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
        const planData = await fetchUserPlan(user.uid);

        if (!planData) {
          throw new Error("No valid plan found");
        }
        setPlan(planData);

      } catch (e) {
        console.error("Failed to load plan", e);
        setPlan(null);
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader label="Loading your personalized plan..." />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center">
          <p className="text-lg mb-4">No plan generated yet.</p>
          <p className="text-sm text-gray-600">Log at least 7 days of vitals to generate your first plan.</p>
        </div>
      </div>
    );
  }

  const metrics = plan.metrics || {};
  const comparison = plan.comparison;
  const dayPlans = plan.dayPlans || [];

  return (
    <div className={`${lexend.className} min-h-screen bg-[#f8f6f8] text-[#4a0034]`}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 sm:mb-8 text-sm text-[#7a004b] hover:text-[#5c0037] transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <h1 className={`${lexendTera.className} text-3xl sm:text-5xl text-[#7a004b] mb-2`}>
          My Weekly Plan
        </h1>

        {/* Generation date */}
        {plan.generatedAt && (
          <p className="text-sm text-[#7a004b]/70 mb-6">
            Generated on {new Date(plan.generatedAt).toLocaleDateString()}
          </p>
        )}

        {/* Status banner */}
        <div
          className={`p-4 rounded-xl mb-6 sm:mb-8 ${
            plan.source === "rule-engine+ai"
              ? "bg-green-100 text-green-800"
              : plan.source === "rule-engine"
              ? "bg-blue-100 text-blue-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          <p className="font-semibold flex items-center gap-2">
            <CheckCircle2 size={18} />
            {plan.message || "Your personalized weekly plan is ready."}
          </p>
          {plan.persisted === false && (
            <p className="text-sm mt-2 opacity-75">
              Note: Plan was generated but may not have been saved. Please try again if needed.
            </p>
          )}
        </div>

        <div className="space-y-6">
          {/* Weekly Focus */}
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 border border-green-200">
            <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <CheckCircle2 size={20} />
              Weekly Focus: {plan.focus || "Balanced Maintenance Week"}
            </h2>
            <p className="text-sm text-gray-700">{plan.message}</p>
          </div>

          {/* Week Comparison */}
          {comparison && comparison.hasPreviousWeek && (
            <div className="p-5 rounded-2xl bg-white shadow border">
            <h2 className="font-semibold text-lg mb-4">Week-over-Week Comparison</h2>
            <div className="space-y-3">
              {comparison.glucoseChange !== null && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Average Glucose</span>
                  <div className="flex items-center gap-2">
                    {comparison.glucoseTrend === "improved" && (
                      <>
                        <TrendingDown className="text-green-600" size={18} />
                        <span className="text-green-600 font-semibold">
                          {Math.abs(comparison.glucoseChange)} mg/dL lower
                        </span>
                      </>
                    )}
                    {comparison.glucoseTrend === "worsened" && (
                      <>
                        <TrendingUp className="text-red-600" size={18} />
                        <span className="text-red-600 font-semibold">
                          {comparison.glucoseChange} mg/dL higher
                        </span>
                      </>
                    )}
                    {comparison.glucoseTrend === "stable" && (
                      <>
                        <Minus className="text-gray-600" size={18} />
                        <span className="text-gray-600 font-semibold">Stable</span>
                      </>
                    )}
                  </div>
                </div>
              )}
              {comparison.activityChange !== null && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Daily Steps</span>
                  <div className="flex items-center gap-2">
                    {comparison.activityTrend === "improved" && (
                      <>
                        <TrendingUp className="text-green-600" size={18} />
                        <span className="text-green-600 font-semibold">
                          +{comparison.activityChange} steps
                        </span>
                      </>
                    )}
                    {comparison.activityTrend === "worsened" && (
                      <>
                        <TrendingDown className="text-red-600" size={18} />
                        <span className="text-red-600 font-semibold">
                          {comparison.activityChange} steps
                        </span>
                      </>
                    )}
                    {comparison.activityTrend === "stable" && (
                      <>
                        <Minus className="text-gray-600" size={18} />
                        <span className="text-gray-600 font-semibold">Stable</span>
                      </>
                    )}
                  </div>
                </div>
              )}
              {comparison.adherenceChange !== null && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Logging Consistency</span>
                  <div className="flex items-center gap-2">
                    {comparison.adherenceTrend === "improved" && (
                      <>
                        <TrendingUp className="text-green-600" size={18} />
                        <span className="text-green-600 font-semibold">
                          +{comparison.adherenceChange}%
                        </span>
                      </>
                    )}
                    {comparison.adherenceTrend === "worsened" && (
                      <>
                        <TrendingDown className="text-red-600" size={18} />
                        <span className="text-red-600 font-semibold">
                          {comparison.adherenceChange}%
                        </span>
                      </>
                    )}
                    {comparison.adherenceTrend === "stable" && (
                      <>
                        <Minus className="text-gray-600" size={18} />
                        <span className="text-gray-600 font-semibold">Stable</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            {comparison.insights && comparison.insights.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-sm mb-2">Key Insights</h3>
                <ul className="text-sm space-y-1">
                  {comparison.insights.map((insight: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          )}

          {/* Analytics */}
          <div className="p-5 rounded-2xl bg-white shadow border">
            <h2 className="font-semibold text-lg mb-3">Weekly Insights</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {metrics.avgGlucose !== null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Average Glucose</p>
                  <p className="text-lg font-semibold">{metrics.avgGlucose} mg/dL</p>
                </div>
              )}
              {metrics.glucoseStdDev !== null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Glucose Variability</p>
                  <p className="text-lg font-semibold">{metrics.glucoseStdDev} mg/dL</p>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Adherence Score</p>
                <p className="text-lg font-semibold">{metrics.adherenceScore || 0}%</p>
              </div>
              {metrics.avgSteps !== null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Average Daily Steps</p>
                  <p className="text-lg font-semibold">{metrics.avgSteps.toLocaleString()}</p>
                </div>
              )}
              {metrics.insulinConsistencyScore !== null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Insulin Consistency</p>
                  <p className="text-lg font-semibold">{metrics.insulinConsistencyScore}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Daily Plans */}
          <div className="p-5 rounded-2xl bg-white shadow border">
            <h2 className="font-semibold text-lg mb-4">7-Day Plan</h2>
            <div className="space-y-4">
              {dayPlans.map((dayPlan: any, index: number) => (
                <div key={index} className="border-l-4 border-[#7a004b] pl-4 pb-4 last:pb-0">
                  <h3 className="font-semibold mb-2">{dayPlan.day}</h3>
                  <div className="space-y-2 text-sm">
                    {dayPlan.diet && dayPlan.diet.length > 0 && (
                      <div>
                        <p className="font-medium text-[#7a004b] mb-1">Diet:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {dayPlan.diet.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {dayPlan.activity && dayPlan.activity.length > 0 && (
                      <div>
                        <p className="font-medium text-[#7a004b] mb-1">Activity:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {dayPlan.activity.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {dayPlan.wellness && dayPlan.wellness.length > 0 && (
                      <div>
                        <p className="font-medium text-[#7a004b] mb-1">Wellness:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {dayPlan.wellness.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optional AI Summary */}
          {plan.aiSummary && (
            <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200">
              <h2 className="font-semibold text-lg mb-2">AI Summary</h2>
              <p className="text-sm whitespace-pre-wrap text-gray-700">{plan.aiSummary}</p>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="mt-8 p-4 bg-red-100 text-red-800 rounded-lg flex items-start gap-2 text-sm">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
          <p>
            Sweeten provides guidance, not medical advice. Always consult a
            healthcare professional for medical decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
