// lib/vitalsAdmin.ts
// Server-only functions using Firebase Admin SDK
// This file should NEVER be imported in client components

import "server-only";

import { adminDb, admin } from "./firebaseAdmin";
import { VitalsEntry } from "./vitals";
import { Timestamp } from "firebase/firestore";

/** Server-side: Fetches all vitals using Admin SDK */
export async function fetchAllVitalsAdmin(uid: string): Promise<VitalsEntry[]> {
  const snaps = await adminDb
    .collection(`users/${uid}/vitals`)
    .get();
  
  const vitals: VitalsEntry[] = [];
  snaps.forEach(d => {
    const data = d.data() as Partial<VitalsEntry>;
    let createdAt: Timestamp;
    
    if (data.createdAt) {
      // Convert Admin SDK Timestamp to client SDK Timestamp
      const adminTimestamp = data.createdAt as ReturnType<typeof admin.firestore.Timestamp.now>;
      // Check if it's an Admin Timestamp (has toMillis method)
      if (typeof (adminTimestamp as any).toMillis === "function") {
        createdAt = Timestamp.fromMillis((adminTimestamp as any).toMillis());
      } else {
        // Fallback: try to extract seconds/nanoseconds
        const ts = adminTimestamp as any;
        createdAt = Timestamp.fromMillis(
          (ts.seconds || 0) * 1000 + Math.floor((ts.nanoseconds || 0) / 1000000)
        );
      }
    } else {
      createdAt = Timestamp.now();
    }
    
    vitals.push({
      id: d.id,
      date: d.id,
      bloodSugar: data.bloodSugar ?? null,
      bloodPressure: data.bloodPressure ?? { sys: null, dia: null },
      weight: data.weight ?? null,
      insulinUnits: data.insulinUnits ?? null,
      carbs: data.carbs ?? null,
      steps: data.steps ?? null,
      mood: data.mood ?? "",
      notes: data.notes ?? null,
      createdAt,
      confirmed: data.confirmed ?? false,
    });
  });

  vitals.sort((a, b) => a.date.localeCompare(b.date));
  return vitals;
}

/** Server-side: Fetches previous week's plan for comparison */
export async function fetchPreviousPlanAdmin(uid: string, currentWeekStart: string): Promise<any | null> {
  // Get all plans, find the one before current week
  const snaps = await adminDb
    .collection(`users/${uid}/plans`)
    .orderBy("weekStart", "desc")
    .get();
  
  // Find the plan that's before currentWeekStart
  for (const doc of snaps.docs) {
    const planData = doc.data();
    if (planData.weekStart < currentWeekStart) {
      return planData;
    }
  }
  
  return null;
}

