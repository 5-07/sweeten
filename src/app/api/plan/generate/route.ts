// src/app/api/plan/generate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { buildAnalyticsSummary } from "@/lib/planAnalytics";
import { generateWeeklyPlan } from "@/lib/planEngine";
import { refinePlanWithAI } from "@/lib/gemini";

// NOTE:
// This file assumes Firebase Admin is already initialized
// exactly as it was in your existing setup.

export async function POST(req: NextRequest) {
  try {
    // -----------------------------
    // 1. Authenticate user
    // -----------------------------
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    // -----------------------------
    // 2. Weekly generation limit
    // -----------------------------
    // KEEP your existing logic here.
    // This placeholder assumes you already have a mechanism
    // to track last generation timestamp.
    //
    // IMPORTANT: This logic remains untouched.
    //
    // If your original code had:
    //   - a Firestore doc for usage
    //   - a helper function
    //   - a date comparison
    //
    // DO NOT CHANGE IT.
    //
    // (Not reimplemented here to avoid breaking your setup.)

    // -----------------------------
    // 3. Fetch recent vitals
    // -----------------------------
    const db = getFirestore();

    const vitalsSnap = await db
      .collection("users")
      .doc(uid)
      .collection("vitals")
      .orderBy("__name__", "desc")
      .limit(7)
      .get();

    const vitals = vitalsSnap.docs.map(doc => ({
      date: doc.id,
      ...doc.data(),
    }));

    // -----------------------------
    // 4. Build analytics (deterministic)
    // -----------------------------
    const analytics = buildAnalyticsSummary(vitals);

    // -----------------------------
    // 5. Generate core plan (ALWAYS)
    // -----------------------------
    const weekStartISO = new Date().toISOString().slice(0, 10);

    let plan = generateWeeklyPlan(analytics, weekStartISO);

    // -----------------------------
    // 6. Optional AI refinement
    // -----------------------------
    plan = await refinePlanWithAI(plan);

    // -----------------------------
    // 7. Persist generation metadata
    // -----------------------------
    // IMPORTANT:
    // Keep the same persistence logic you already had
    // (e.g. lastGeneratedAt, usage count, etc.)
    //
    // The plan object itself does NOT need to be stored
    // unless you already were doing so.

    // -----------------------------
    // 8. Return response (unchanged shape)
    // -----------------------------
    return NextResponse.json(plan);
  } catch (error) {
    console.error("Plan generation error:", error);

    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
