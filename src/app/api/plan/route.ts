// src/app/api/plan/route.ts

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { generatePlanFromVitals } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "Missing UID" }, { status: 400 });
    }

    // Fetch recent vitals
    const vitalsSnap = await adminDb
      .collection(`users/${uid}/vitals`)
      .orderBy("date", "desc")
      .limit(14)
      .get();

    const vitals = vitalsSnap.docs.map((d) => d.data());

    if (!vitals.length) {
      return NextResponse.json(
        { error: "No vitals found." },
        { status: 400 }
      );
    }

    // Generate plan text
    const planText = await generatePlanFromVitals(vitals);

    // ✅ Save to the correct location that the client reads:
    await adminDb
      .doc(`users/${uid}/meta/plan`)
      .set({
        plan: planText,
        generatedAt: new Date().toISOString(),
      });

    return NextResponse.json({ plan: planText }, { status: 200 });
  } catch (err) {
    console.error("API/plan error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
