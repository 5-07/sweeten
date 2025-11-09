import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: "Missing auth token" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Get this month's usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);

    const snap = await adminDb.collection("users").doc(uid).collection("apiUsage")
      .where("createdAt", ">=", startOfMonth).get();

    let totalTokens = 0;
    snap.docs.forEach(d => {
      const t = d.data().tokensUsed || 0;
      totalTokens += t;
    });

    return NextResponse.json({
      monthTokens: totalTokens,
      approxLeft: Math.max(0, 1_000_000 - totalTokens),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
