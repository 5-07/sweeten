// src/lib/planAnalytics.ts

export type DailyVitals = {
  date: string; // YYYY-MM-DD
  glucose: number;
  insulin?: number;
  carbs?: number;
  weight?: number;
  steps?: number;
  mood?: number; // assumed 1–5
};

export type AnalyticsSummary = {
  daysAnalyzed: number;
  avgGlucose: number | null;
  glucoseStdDev: number | null;
  insulinConsistencyScore: number | null; // 0–100
  adherenceScore: number; // 0–100
  avgSteps: number | null;
  activityTrend: "up" | "down" | "flat";
  moodTrend: "up" | "down" | "flat" | "unknown";
};

export function buildAnalyticsSummary(
  vitals: DailyVitals[]
): AnalyticsSummary {
  if (vitals.length === 0) {
    return {
      daysAnalyzed: 0,
      avgGlucose: null,
      glucoseStdDev: null,
      insulinConsistencyScore: null,
      adherenceScore: 0,
      avgSteps: null,
      activityTrend: "flat",
      moodTrend: "unknown",
    };
  }

  const daysAnalyzed = vitals.length;

  // --- Glucose analytics ---
  const glucoseValues = vitals.map(v => v.glucose);
  const avgGlucose =
    glucoseValues.reduce((a, b) => a + b, 0) / glucoseValues.length;

  const glucoseVariance =
    glucoseValues.reduce(
      (sum, g) => sum + Math.pow(g - avgGlucose, 2),
      0
    ) / glucoseValues.length;

  const glucoseStdDev = Math.sqrt(glucoseVariance);

  // --- Insulin consistency ---
  const insulinDays = vitals.filter(v => v.insulin !== undefined);
  const insulinConsistencyScore =
    insulinDays.length === 0
      ? null
      : Math.round((insulinDays.length / daysAnalyzed) * 100);

  // --- Adherence score (logging completeness) ---
  const adherenceScore = Math.round(
    (daysAnalyzed / 7) * 100
  );

  // --- Activity analytics ---
  const stepValues = vitals
    .map(v => v.steps)
    .filter((s): s is number => typeof s === "number");

  const avgSteps =
    stepValues.length > 0
      ? Math.round(stepValues.reduce((a, b) => a + b, 0) / stepValues.length)
      : null;

  let activityTrend: "up" | "down" | "flat" = "flat";
  if (stepValues.length >= 4) {
    const firstHalf = stepValues.slice(0, Math.floor(stepValues.length / 2));
    const secondHalf = stepValues.slice(Math.floor(stepValues.length / 2));

    const avgFirst =
      firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond =
      secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (avgSecond > avgFirst * 1.1) activityTrend = "up";
    else if (avgSecond < avgFirst * 0.9) activityTrend = "down";
  }

  // --- Mood trend ---
  const moodValues = vitals
    .map(v => v.mood)
    .filter((m): m is number => typeof m === "number");

  let moodTrend: "up" | "down" | "flat" | "unknown" = "unknown";

  if (moodValues.length >= 4) {
    const first = moodValues.slice(0, Math.floor(moodValues.length / 2));
    const second = moodValues.slice(Math.floor(moodValues.length / 2));

    const avgFirst =
      first.reduce((a, b) => a + b, 0) / first.length;
    const avgSecond =
      second.reduce((a, b) => a + b, 0) / second.length;

    if (avgSecond > avgFirst + 0.3) moodTrend = "up";
    else if (avgSecond < avgFirst - 0.3) moodTrend = "down";
    else moodTrend = "flat";
  }

  return {
    daysAnalyzed,
    avgGlucose: Math.round(avgGlucose),
    glucoseStdDev: Math.round(glucoseStdDev),
    insulinConsistencyScore,
    adherenceScore: Math.min(adherenceScore, 100),
    avgSteps,
    activityTrend,
    moodTrend,
  };
}
