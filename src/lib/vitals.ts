// lib/vitals.ts

import { db } from "./firebase";
import { doc, getDoc, setDoc, Timestamp, collection, getDocs } from "firebase/firestore";
import { generateFallbackPlan } from "./generateFallbackPlan";
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
    bloodSugar: vitals.bloodSugar === "" ? null : vitals.bloodSugar,
    bloodPressure: vitals.bloodPressure,
    weight: vitals.weight === "" ? null : vitals.weight,
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
    bloodSugar: vitals.bloodSugar === "" ? null : vitals.bloodSugar,
    insulinUnits: vitals.insulinUnits === "" ? null : vitals.insulinUnits,
    carbs: vitals.carbs === "" ? null : vitals.carbs,
    steps: vitals.steps === "" ? null : vitals.steps,
    weight: vitals.weight === "" ? null : vitals.weight,
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

/** Fetches the generated plan from the meta document. */
export async function fetchUserPlan(uid: string) {
    const docRef = doc(db, "users", uid, "meta", "plan");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data();
        // Return the plan text or a stringified version
        return data.plan || data.text || JSON.stringify(data);
    }
    return null;
}