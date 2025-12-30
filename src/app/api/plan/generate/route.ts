import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, adminDb } from "@/lib/firebaseAdmin";
import { fetchAllVitalsAdmin, fetchPreviousPlanAdmin } from "@/lib/vitalsAdmin";
import { buildAnalyticsSummary, DailyVitals } from "@/lib/planAnalytics";
import { generateWeeklyPlan } from "@/lib/planEngine";
import { refinePlanWithAI } from "@/lib/gemini";

/**
 * POST /api/plan/generate
 * 
 * Generates a weekly health plan for the authenticated user.
 * 
 * Requirements:
 * - User must be authenticated (Bearer token)
 * - Fetches vitals from Firestore (last 7 confirmed days)
 * - Generates plan using rule engine (deterministic)
 * - Optionally refines with AI (non-blocking)
 * - Saves to Firestore (non-blocking)
 * - Always returns a plan, even if persistence fails
 * 
 * Response:
 * {
 *   plan: WeeklyPlan,
 *   persisted: boolean
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = authHeader.split(" ")[1];
    const decoded = await verifyIdToken(idToken);
    const uid = decoded.uid;

    // 2. Fetch vitals (server-side using Admin SDK)
    // Accept vitals from body if provided (backward compatibility), otherwise fetch from DB
    const body = await req.json().catch(() => ({}));
    let recentVitals: Awaited<ReturnType<typeof fetchAllVitalsAdmin>>;
    
    if (body.vitals && Array.isArray(body.vitals) && body.vitals.length >= 7) {
      // Use provided vitals (backward compatibility)
      recentVitals = body.vitals.map((v: any) => ({
        id: v.date || v.id,
        date: v.date,
        bloodSugar: v.bloodSugar ?? null,
        bloodPressure: v.bloodPressure ?? { sys: null, dia: null },
        weight: v.weight ?? null,
        insulinUnits: v.insulinUnits ?? null,
        carbs: v.carbs ?? null,
        steps: v.steps ?? null,
        mood: v.mood ?? "",
        notes: v.notes ?? null,
        createdAt: {} as any, // Not needed for analytics
        confirmed: true, // Assume confirmed if provided
      }));
    } else {
      // Fetch from database
      let allVitals: Awaited<ReturnType<typeof fetchAllVitalsAdmin>>;
      try {
        allVitals = await fetchAllVitalsAdmin(uid);
      } catch (vitalsError) {
        console.error("Failed to fetch vitals:", vitalsError);
        // Continue with empty vitals - will generate baseline plan
        allVitals = [];
      }
      
      // Get last 7 days of confirmed vitals, or all if less than 7
      recentVitals = allVitals
        .filter(v => v.confirmed)
        .slice(-7);
    }

    // 3. Build analytics with null-safety
    const vitalsForAnalytics: DailyVitals[] = recentVitals.map(v => ({
      date: v.date,
      glucose: v.bloodSugar ?? 0, // Use 0 as placeholder, analytics will filter
      insulin: v.insulinUnits ?? undefined,
      carbs: v.carbs ?? undefined,
      weight: v.weight ?? undefined,
      steps: v.steps ?? undefined,
      mood: typeof v.mood === "string" 
        ? (v.mood === "great" ? 5 : v.mood === "good" ? 4 : v.mood === "ok" ? 3 : v.mood === "bad" ? 2 : 1)
        : undefined,
    }));

    const metrics = buildAnalyticsSummary(vitalsForAnalytics);

    // 4. Calculate week start (Monday of current week)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const diff = (day === 0 ? -6 : 1 - day); // Monday as start (0 = Sunday, 1 = Monday)
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() + diff);
    const weekStartStr = weekStartDate.toISOString().slice(0, 10);

    // 5. Fetch previous week's plan for comparison
    let previousPlan = null;
    let previousMetrics = null;
    try {
      previousPlan = await fetchPreviousPlanAdmin(uid, weekStartStr);
      if (previousPlan && previousPlan.metrics) {
        previousMetrics = previousPlan.metrics;
      }
    } catch (prevError) {
      console.warn("Failed to fetch previous plan for comparison:", prevError);
      // Continue without comparison
    }

    // 6. Generate plan (always succeeds due to baseline handling)
    let weeklyPlan = generateWeeklyPlan(metrics, weekStartStr, previousMetrics);

    // 7. Optional AI refinement (best-effort, never fails)
    try {
      weeklyPlan = await refinePlanWithAI(weeklyPlan);
    } catch (aiError) {
      console.warn("AI refinement failed, using rule-engine plan:", aiError);
      // Continue with rule-engine plan
    }

    // 8. Persist to Firestore (Admin SDK) - non-blocking
    let persisted = false;
    try {
      await adminDb
        .doc(`users/${uid}/plans/${weekStartStr}`)
        .set({
          ...weeklyPlan,
          generatedAt: new Date().toISOString(),
        }, { merge: true });
      persisted = true;
    } catch (writeError) {
      console.error("Failed to persist plan:", writeError);
      // Continue and return plan anyway (user can retry)
      persisted = false;
    }

    // 9. Return plan (always succeeds)
    return NextResponse.json(
      { 
        plan: {
          ...weeklyPlan,
          persisted,
        },
        persisted,
      },
      { status: 200 }
    );

  } catch (err: any) {
    console.error("Plan generation error:", err);
    
    // Return error with context
    return NextResponse.json(
      { 
        error: err.message || "Internal error",
        code: err.code || "UNKNOWN"
      },
      { status: err.status || 500 }
    );
  }
}
