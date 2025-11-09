// lib/generateFallbackPlan.ts
export function generateFallbackPlan(context?: { avgGlucose?: number } | null) {
  const avg = context?.avgGlucose ?? null;
  const baseline = [
    { day: "Day 1", diet: ["Choose non-starchy vegetables with each meal", "Limit sugary drinks"], exercise: ["30-minute brisk walk"], wellness: ["Drink water frequently"] },
    { day: "Day 2", diet: ["Prefer whole grains, avoid refined carbs"], exercise: ["20–30 min light cardio"], wellness: ["Aim for 7–8 hours sleep"] },
    { day: "Day 3", diet: ["Include lean protein with meals"], exercise: ["Resistance exercises 20 min (bodyweight)"], wellness: ["Practice mindful breathing 5 min"] },
    { day: "Day 4", diet: ["Reduce portion size of high-carb foods"], exercise: ["30-minute walk"], wellness: ["Stay hydrated"] },
    { day: "Day 5", diet: ["Focus on fiber-rich snacks"], exercise: ["Interval walking 20 min"], wellness: ["Avoid late-night heavy meals"] },
    { day: "Day 6", diet: ["Balance carbs with protein"], exercise: ["Light strength + mobility"], wellness: ["Check glucose regularly"] },
    { day: "Day 7", diet: ["Plan meals for next week (consistent carbs)"], exercise: ["Active recovery (stretching)"], wellness: ["Reflect on week and notes"] },
  ];
  const header = avg ? `Fallback plan (avg glucose ${Math.round(avg)} mg/dL).` : "Fallback plan (no recent vitals).";
  return {
    source: "fallback",
    message: header,
    dayPlans: baseline,
  };
}
