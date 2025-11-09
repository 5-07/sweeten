// src/components/TodayVitalsDialog.tsx
"use client";

import { useState, useEffect } from "react";
import { saveAndConfirmTodayVitals, getTodayVitals, VitalsEntry } from "@/lib/vitals";
import { auth } from "@/lib/firebase";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void; // e.g. refresh parent lists
};

export default function TodayVitalsDialog({ open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<VitalsEntry | null>(null);
  const [bloodSugar, setBloodSugar] = useState<string>("");
  const [sys, setSys] = useState<string>("");
  const [dia, setDia] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    (async () => {
      const v = await getTodayVitals(uid);
      setExisting(v);
      if (v && v.confirmed) {
        setBloodSugar(v.bloodSugar?.toString() ?? "");
        setSys(v.bloodPressure.sys?.toString() ?? "");
        setDia(v.bloodPressure.dia?.toString() ?? "");
        setWeight(v.weight?.toString() ?? "");
        setNotes(v.notes ?? "");
      }
    })();
  }, [open]);

  const confirmed = !!existing?.confirmed;

  async function handleSave() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoading(true);
    try {
      await saveAndConfirmTodayVitals(uid, {
        bloodSugar: bloodSugar ? Number(bloodSugar) : null,
        bloodPressure: {
          sys: sys ? Number(sys) : null,
          dia: dia ? Number(dia) : null,
        },
        weight: weight ? Number(weight) : null,
        notes: notes || null,
      });
      onSaved?.();
      onClose();
    } catch (e: any) {
      alert(e.message ?? "Could not save today’s vitals.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Enter Today’s Vitals</h2>
          {confirmed && (
            <p className="mt-1 text-sm text-red-600">
              Today is already confirmed — entries are read-only.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-sm">Blood Sugar (mg/dL)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border p-2"
              value={bloodSugar}
              onChange={(e) => setBloodSugar(e.target.value)}
              disabled={confirmed}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm">Systolic (mmHg)</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border p-2"
                value={sys}
                onChange={(e) => setSys(e.target.value)}
                disabled={confirmed}
              />
            </label>
            <label className="block">
              <span className="text-sm">Diastolic (mmHg)</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border p-2"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                disabled={confirmed}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm">Weight (kg)</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border p-2"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              disabled={confirmed}
            />
          </label>

          <label className="block">
            <span className="text-sm">Notes</span>
            <textarea
              className="mt-1 w-full rounded-lg border p-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={confirmed}
              rows={3}
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button className="rounded-lg border px-3 py-2" onClick={onClose} disabled={loading}>
            Close
          </button>
          <button
            className="rounded-lg bg-black px-3 py-2 text-white disabled:opacity-50"
            onClick={handleSave}
            disabled={loading || confirmed}
          >
            {loading ? "Saving..." : "Save & Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
