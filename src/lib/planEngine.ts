// src/lib/planEngine.ts

import { AnalyticsSummary } from "./planAnalytics";

export type DayPlan = {
  day: string;
  diet: string[];
  activity: string[];
  wellness: string[];
};

export type WeeklyPlan = {
  source: "rule-engine" | "rule-engine+ai";
  weekStart: string;
  focus: string;
  message: string;
  metrics: AnalyticsSummary;
  dayPlans: DayPlan[];
  aiSummary?: string;
};

function determinePlanFocus(metrics: AnalyticsSummary): string {
  if (
    metrics.avgGlucose !== null &&
    (metrics.avgGlucose > 160 ||
      (metrics.glucoseStdDev !== null && metrics.glucoseStdDev > 45))
  ) {
    return "Stability Focus Week";
  }

  if (metrics.insulinConsistencyScore !== null &&
      metrics.insulinConsistencyScore < 70) {
    return "Consistency Reset Week";
  }

  if (metrics.activityTrend === "down") {
    return "Activity Rebuild Week";
  }

  if (metrics.moodTrend === "down") {
    return "Recovery & Stress-Aware Week";
  }

  return "Balanced Maintenance Week";
}

function buildDayPlan(focus: string, dayIndex: number): DayPlan {
  switch (focus) {
    case "Stability Focus Week":
      return {
        day: `Day ${dayIndex + 1}`,
        diet: [
          "Prioritize low–glycemic index meals",
          "Space carbohydrates evenly across meals",
        ],
        activity: [
          "Light walk after meals (10–15 min)",
        ],
        wellness: [
          "Monitor glucose trends, not individual spikes",
        ],
      };

    case "Consistency Reset Week":
      return {
        day: `Day ${dayIndex + 1}`,
        diet: [
          "Keep meal timing consistent",
          "Avoid skipping meals",
        ],
        activity: [
          "Short daily movement session",
        ],
        wellness: [
          "Set reminders for insulin logging",
        ],
      };

    case "Activity Rebuild Week":
      return {
        day: `Day ${dayIndex + 1}`,
        diet: [
          "Maintain usual diet patterns",
          "Hydrate adequately",
        ],
        activity: [
          "Gentle activity goal (+500–1000 steps)",
        ],
        wellness: [
          "Focus on building habit, not intensity",
        ],
      };

    case "Recovery & Stress-Aware Week":
      return {
        day: `Day ${dayIndex + 1}`,
        diet: [
          "Choose familiar, easy-to-digest meals",
        ],
        activity: [
          "Low-pressure movement (stretching or walking)",
        ],
        wellness: [
          "Prioritize rest and emotional recovery",
        ],
      };

    default:
      return {
        day: `Day ${dayIndex + 1}`,
        diet: [
          "Balanced meals with mindful carb intake",
        ],
        activity: [
          "Maintain regular activity level",
        ],
        wellness: [
          "Continue current routine",
        ],
      };
  }
}

export function generateWeeklyPlan(
  metrics: AnalyticsSummary,
  weekStartISO: string
): WeeklyPlan {
  const focus = determinePlanFocus(metrics);

  const dayPlans: DayPlan[] = Array.from({ length: 7 }).map((_, i) =>
    buildDayPlan(focus, i)
  );

  const message = `This week focuses on "${focus}". The plan is built using your recent trends to support consistency, safety, and sustainable habits.`;

  return {
    source: "rule-engine",
    weekStart: weekStartISO,
    focus,
    message,
    metrics,
    dayPlans,
  };
}
