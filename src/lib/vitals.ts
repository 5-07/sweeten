// lib/vitals.ts

import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

import { User } from "firebase/auth";

// Unified, complete Vitals entry structure
export type VitalsEntry = {
  id: string; // The date string (YYYY-MM-DD)
  date: string;
  bloodSugar: number | null;
  bloodPressure: {
    sys: number | null;
    dia: number | null;
  };
  weight: number | null;
  insulinUnits: number | null;
  carbs: number | null;
  steps: number | null;
  mood: string;
  notes: string | null;
  createdAt: Timestamp;
  confirmed: boolean; // Flag to lock the entry after initial save
};

// Data type for feeding into the Gemini AI (subset of VitalsEntry)
export type VitalsForPlan = Omit<VitalsEntry, 'id' | 'createdAt' | 'confirmed'>[];


const VITALS_COLLECTION = (uid: string) => collection(db, "users", uid, "vitals");
const VITALS_DOC = (uid: string, date: string) => doc(db, "users", uid, "vitals", date);

const isoToday = () => new Date().toISOString().slice(0, 10);

/** Fetches a single day's vitals. */
export async function getTodayVitals(uid: string): Promise<VitalsEntry | null> {
  const date = isoToday();
  const snap = await getDoc(VITALS_DOC(uid, date));
  if (snap.exists()) {
    const data = snap.data() as Partial<VitalsEntry>;
    return {
      id: date,
      date,
      bloodSugar: data.bloodSugar ?? null,
      bloodPressure: data.bloodPressure ?? { sys: null, dia: null },
      weight: data.weight ?? null,
      insulinUnits: data.insulinUnits ?? null,
      carbs: data.carbs ?? null,
      steps: data.steps ?? null,
      mood: data.mood ?? "",
      notes: data.notes ?? null,
      createdAt: data.createdAt ?? Timestamp.now(),
      confirmed: data.confirmed ?? false,
    };
  }
  return null;
}

/** Saves and confirms today's vitals (sets `confirmed: true`). */
export async function saveAndConfirmTodayVitals(uid: string, vitals: Partial<Omit<VitalsEntry, 'id' | 'date' | 'createdAt' | 'confirmed'>>): Promise<void> {
  const date = isoToday();
  await setDoc(VITALS_DOC(uid, date), {
    date,
    bloodSugar: (typeof vitals.bloodSugar === "string" && vitals.bloodSugar === "") ? null : vitals.bloodSugar,
    bloodPressure: vitals.bloodPressure,
    weight: (typeof vitals.weight === "string" && vitals.weight === "") ? null : vitals.weight,
    insulinUnits: vitals.insulinUnits ?? null,
    carbs: vitals.carbs ?? null,
    steps: vitals.steps ?? null,
    mood: vitals.mood ?? "",
    notes: vitals.notes ?? null,
    confirmed: true, // Crucial: sets the entry as finalized
    updatedAt: Timestamp.now(),
  }, { merge: true });
}


/** Saves a single day's vitals (used by the Vitals calendar for updates). */
export async function saveVitalsEntry(uid: string, date: string, vitals: Partial<VitalsEntry>): Promise<void> {
  const ref = VITALS_DOC(uid, date);
  await setDoc(ref, {
    ...vitals,
    date,
    updatedAt: Timestamp.now(),
    // Ensure fields are coerced to null if empty string
    bloodSugar: (typeof vitals.bloodSugar === "string" && vitals.bloodSugar === "") ? null : vitals.bloodSugar,
    insulinUnits: (typeof vitals.insulinUnits === "string" && vitals.insulinUnits === "") ? null : vitals.insulinUnits,
    carbs: (typeof vitals.carbs === "string" && vitals.carbs === "") ? null : vitals.carbs,
    steps: (typeof vitals.steps === "string" && vitals.steps === "") ? null : vitals.steps,
    weight: (typeof vitals.weight === "string" && vitals.weight === "") ? null : vitals.weight,
  }, { merge: true });
}

/** Fetches all vitals entries. */
export async function fetchAllVitals(uid: string): Promise<VitalsEntry[]> {
    const snaps = await getDocs(VITALS_COLLECTION(uid));
    const vitals: VitalsEntry[] = [];
    snaps.forEach(d => {
        const data = d.data() as Partial<VitalsEntry>;
        // Map data to the VitalsEntry structure for consistency
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
            createdAt: data.createdAt ?? Timestamp.now(),
            confirmed: data.confirmed ?? false,
        });
    });

    // Sort by date (ID) ascending
    vitals.sort((a, b) => a.date.localeCompare(b.date));
    return vitals;
}

/** Utility to get the user's current JWT for API calls. */
export async function getAuthToken(user: User | null): Promise<string> {
    if (!user) {
        throw new Error("User not authenticated.");
    }
    return user.getIdToken();
}

/** Fetches the user's latest generated weekly plan */
export async function fetchUserPlan(uid: string) {
  const q = query(
    collection(db, "users", uid, "plans"),
    orderBy("weekStart", "desc"),
    limit(1)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    return null;
  }

  return snap.docs[0].data();
}
