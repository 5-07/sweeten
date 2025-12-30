// src/lib/planEngine.ts

import { AnalyticsSummary } from "./planAnalytics";

export type DayPlan = {
  day: string;
  diet: string[];
  activity: string[];
  wellness: string[];
};

export type WeekComparison = {
  hasPreviousWeek: boolean;
  glucoseChange: number | null; // mg/dL difference
  glucoseTrend: "improved" | "worsened" | "stable" | "unknown";
  activityChange: number | null; // steps difference
  activityTrend: "improved" | "worsened" | "stable" | "unknown";
  adherenceChange: number | null; // percentage point difference
  adherenceTrend: "improved" | "worsened" | "stable" | "unknown";
  insights: string[];
};

export type WeeklyPlan = {
  source: "rule-engine" | "rule-engine+ai";
  weekStart: string;
  focus: string;
  message: string;
  metrics: AnalyticsSummary;
  dayPlans: DayPlan[];
  comparison?: WeekComparison;
  aiSummary?: string;
  persisted?: boolean; // Flag indicating if plan was saved to Firestore
};

function determinePlanFocus(metrics: AnalyticsSummary, comparison?: WeekComparison): string {
  // High glucose or high variability (per ADA guidelines: target <180mg/dL, variability <40mg/dL)
  if (
    metrics.avgGlucose !== null &&
    (metrics.avgGlucose > 180 ||
      (metrics.glucoseStdDev !== null && metrics.glucoseStdDev > 50))
  ) {
    return "Glucose Stability Focus Week";
  }

  // Worsening glucose trend
  if (comparison?.glucoseTrend === "worsened" && metrics.avgGlucose !== null && metrics.avgGlucose > 150) {
    return "Glucose Stability Focus Week";
  }

  // Insulin consistency (per ADA: consistent timing is critical)
  if (metrics.insulinConsistencyScore !== null &&
      metrics.insulinConsistencyScore < 70) {
    return "Medication Consistency Week";
  }

  // Activity decline (per ADA: 150 min/week moderate activity recommended)
  if (metrics.activityTrend === "down" || (metrics.avgSteps !== null && metrics.avgSteps < 5000)) {
    return "Activity Rebuild Week";
  }

  // Mood/stress impact (stress affects glucose control)
  if (metrics.moodTrend === "down") {
    return "Recovery & Stress-Aware Week";
  }

  // Improving trends - maintain momentum
  if (comparison?.glucoseTrend === "improved" || comparison?.activityTrend === "improved") {
    return "Momentum Maintenance Week";
  }

  return "Balanced Maintenance Week";
}

function buildDayPlan(focus: string, dayIndex: number): DayPlan {
  switch (focus) {
    case "Glucose Stability Focus Week":
      return {
        day: `Day ${dayIndex + 1}`,
        diet: [
          "Prioritize low-glycemic index foods (whole grains, vegetables, lean proteins)",
          "Space carbohydrates evenly: 30-45g per meal, 15g snacks",
          "Include fiber-rich foods to slow glucose absorption",
          "Avoid processed sugars and refined carbs",
        ],
        activity: [
          "Light walk 10-15 minutes after meals (helps lower post-meal glucose)",
          "Aim for 20-30 minutes total daily activity",
        ],
        wellness: [
          "Check glucose before meals and 2 hours after",
          "Monitor patterns, not individual readings",
          "Stay hydrated (8-10 glasses water daily)",
        ],
      };

    case "Medication Consistency Week":
      return {
        day: `Day ${dayIndex + 1}`,
        diet: [
          "Keep meal timing consistent (within 30 min window)",
          "Avoid skipping meals to prevent glucose swings",
          "Eat balanced meals at regular intervals",
        ],
        activity: [
          "Short daily movement session (15-20 min)",
          "Time activity consistently with meals",
        ],
        wellness: [
          "Set phone reminders for medication/insulin logging",
          "Use a medication tracking app or journal",
          "Review timing with healthcare provider if needed",
        ],
      };

    case "Activity Rebuild Week":
      return {
        day: `Day ${dayIndex + 1}`,
        diet: [
          "Maintain usual diet patterns",
          "Hydrate adequately before and after activity",
          "Consider a small snack if activity >30 minutes",
        ],
        activity: [
          "Gentle activity goal: add 500-1000 steps daily",
          "Start with 10-minute walks, build gradually",
          "Target: 150 minutes moderate activity per week (ADA guideline)",
        ],
        wellness: [
          "Focus on building habit, not intensity",
          "Check glucose before and after activity",
          "Listen to your body - rest if needed",
        ],
      };

    case "Recovery & Stress-Aware Week":
      return {
        day: `Day ${dayIndex + 1}`,
        diet: [
          "Choose familiar, easy-to-digest meals",
          "Include stress-reducing foods (omega-3s, magnesium-rich foods)",
          "Avoid caffeine and alcohol if they affect your glucose",
        ],
        activity: [
          "Low-pressure movement: stretching, gentle yoga, or walking",
          "Focus on stress reduction over intensity",
        ],
        wellness: [
          "Prioritize 7-9 hours of sleep",
          "Practice stress management (meditation, deep breathing)",
          "Monitor glucose - stress can raise levels",
        ],
      };

    case "Momentum Maintenance Week":
      return {
        day: `Day ${dayIndex + 1}`,
        diet: [
          "Continue your successful meal patterns",
          "Maintain consistent carbohydrate distribution",
          "Keep portion sizes consistent",
        ],
        activity: [
          "Maintain your current activity level",
          "Consider adding 5-10 minutes if feeling strong",
        ],
        wellness: [
          "Celebrate your progress",
          "Continue monitoring and logging",
          "Stay consistent with your routine",
        ],
      };

    default: // "Balanced Maintenance Week"
      return {
        day: `Day ${dayIndex + 1}`,
        diet: [
          "Balanced meals: 45-60g carbs per meal, 15g snacks",
          "Include protein and healthy fats with each meal",
          "Choose whole foods over processed",
        ],
        activity: [
          "Maintain regular activity level (aim for 30 min daily)",
          "Mix cardio and strength training",
        ],
        wellness: [
          "Continue current routine",
          "Regular glucose monitoring",
          "Stay hydrated and get adequate sleep",
        ],
      };
  }
}

/**
 * Compares current week metrics with previous week
 */
export function buildWeekComparison(
  currentMetrics: AnalyticsSummary,
  previousMetrics: AnalyticsSummary | null
): WeekComparison {
  if (!previousMetrics) {
    return {
      hasPreviousWeek: false,
      glucoseChange: null,
      glucoseTrend: "unknown",
      activityChange: null,
      activityTrend: "unknown",
      adherenceChange: null,
      adherenceTrend: "unknown",
      insights: ["This is your first week - focus on building consistent habits."],
    };
  }

  const insights: string[] = [];
  
  // Glucose comparison
  let glucoseChange: number | null = null;
  let glucoseTrend: "improved" | "worsened" | "stable" | "unknown" = "unknown";
  
  if (currentMetrics.avgGlucose !== null && previousMetrics.avgGlucose !== null) {
    glucoseChange = currentMetrics.avgGlucose - previousMetrics.avgGlucose;
    if (glucoseChange < -10) {
      glucoseTrend = "improved";
      insights.push(`Great progress! Your average glucose decreased by ${Math.abs(glucoseChange)} mg/dL.`);
    } else if (glucoseChange > 10) {
      glucoseTrend = "worsened";
      insights.push(`Your average glucose increased by ${glucoseChange} mg/dL. Focus on meal timing and consistency.`);
    } else {
      glucoseTrend = "stable";
      insights.push("Your glucose levels are stable. Continue maintaining your current routine.");
    }
  }

  // Activity comparison
  let activityChange: number | null = null;
  let activityTrend: "improved" | "worsened" | "stable" | "unknown" = "unknown";
  
  if (currentMetrics.avgSteps !== null && previousMetrics.avgSteps !== null) {
    activityChange = currentMetrics.avgSteps - previousMetrics.avgSteps;
    if (activityChange > 500) {
      activityTrend = "improved";
      insights.push(`Excellent! You increased your daily steps by ${activityChange}. Keep it up!`);
    } else if (activityChange < -500) {
      activityTrend = "worsened";
      insights.push(`Your activity decreased by ${Math.abs(activityChange)} steps. Let's rebuild gradually.`);
    } else {
      activityTrend = "stable";
    }
  }

  // Adherence comparison
  let adherenceChange: number | null = null;
  let adherenceTrend: "improved" | "worsened" | "stable" | "unknown" = "unknown";
  
  adherenceChange = currentMetrics.adherenceScore - previousMetrics.adherenceScore;
  if (adherenceChange > 5) {
    adherenceTrend = "improved";
    insights.push(`Your logging consistency improved by ${adherenceChange}%. Great job!`);
  } else if (adherenceChange < -5) {
    adherenceTrend = "worsened";
    insights.push(`Your logging consistency decreased. Try setting daily reminders.`);
  } else {
    adherenceTrend = "stable";
  }

  return {
    hasPreviousWeek: true,
    glucoseChange,
    glucoseTrend,
    activityChange,
    activityTrend,
    adherenceChange,
    adherenceTrend,
    insights,
  };
}

export function generateWeeklyPlan(
  metrics: AnalyticsSummary,
  weekStartISO: string,
  previousMetrics?: AnalyticsSummary | null
): WeeklyPlan {
  // Handle zero-data scenario explicitly
  if (metrics.daysAnalyzed === 0) {
    const baselineDayPlan: DayPlan = {
      day: "Day 1",
      diet: [
        "Start logging meals and blood sugar readings",
        "Aim for consistent meal timing (breakfast, lunch, dinner within 30-min windows)",
        "Include balanced meals: protein, healthy fats, and complex carbs",
      ],
      activity: [
        "Begin with light daily movement (10-15 min walk)",
        "Build gradually toward 150 minutes per week (ADA recommendation)",
      ],
      wellness: [
        "Focus on building consistent logging habits",
        "Check glucose before meals and 2 hours after",
        "Set up reminders for medication tracking",
      ],
    };

    return {
      source: "rule-engine",
      weekStart: weekStartISO,
      focus: "Getting Started Week",
      message: "This is a baseline plan to help you get started. As you log more data, your plans will become more personalized.",
      metrics,
      dayPlans: Array.from({ length: 7 }).map((_, i) => ({
        ...baselineDayPlan,
        day: `Day ${i + 1}`,
      })),
      comparison: buildWeekComparison(metrics, null),
    };
  }

  const comparison = previousMetrics ? buildWeekComparison(metrics, previousMetrics) : undefined;
  const focus = determinePlanFocus(metrics, comparison);

  const dayPlans: DayPlan[] = Array.from({ length: 7 }).map((_, i) =>
    buildDayPlan(focus, i)
  );

  const message = comparison && comparison.hasPreviousWeek
    ? `This week focuses on "${focus}". ${comparison.insights.join(" ")}`
    : `This week focuses on "${focus}". The plan is built using your recent trends to support consistency, safety, and sustainable habits.`;

  return {
    source: "rule-engine",
    weekStart: weekStartISO,
    focus,
    message,
    metrics,
    dayPlans,
    comparison,
  };
}
