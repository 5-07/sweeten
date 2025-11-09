// lib/firebaseAdmin.ts

import * as admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log("✅ Firebase Admin initialized");
  } catch (err) {
    console.error("❌ Firebase Admin initialization error:", err);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export { admin };
