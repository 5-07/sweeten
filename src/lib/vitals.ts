"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function VitalsPage() {
  const [user, setUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [vitals, setVitals] = useState({ glucose: "", insulin: "", carbs: "", weight: "", steps: "", mood: "", notes: "" });
  const [popupOpen, setPopupOpen] = useState(false);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const saveVitals = async () => {
    if (!user || !selectedDate) return;
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    await setDoc(doc(db, `users/${user.uid}/vitals/${dateKey}`), vitals);
    setPopupOpen(false);
  };

  const days = Array.from({ length: 31 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1));

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-rose-100 via-white to-sky-100 font-[Lexend] flex flex-col items-center p-6">
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">Vitals Tracker</h1>

      {/* Month Navigation */}
      <div className="flex justify-between w-full max-w-md mb-4">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))}>← Prev</button>
        <p className="font-medium">{month.toLocaleString("default", { month: "long", year: "numeric" })}</p>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))}>Next →</button>
      </div>

      {/* Calendar */}
      <div className="grid grid-cols-7 gap-3">
        {days.map((day) => (
          <motion.div
            key={day.toISOString()}
            className={`w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer ${
              format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                ? "bg-red-300 text-white"
                : "bg-white border border-gray-200 hover:bg-rose-50"
            }`}
            whileHover={{ scale: 1.05 }}
            onClick={() => {
              setSelectedDate(day);
              setPopupOpen(true);
            }}
          >
            {day.getDate()}
          </motion.div>
        ))}
      </div>

      {/* Popup */}
      {popupOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setPopupOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-80 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-3">Add Vitals ({format(selectedDate!, "MMM d")})</h2>
            {Object.keys(vitals).map((key) => (
              <input
                key={key}
                type="text"
                placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                value={(vitals as any)[key]}
                onChange={(e) => setVitals({ ...vitals, [key]: e.target.value })}
                className="w-full mb-2 p-2 border rounded-md text-sm"
              />
            ))}
            <button
              onClick={saveVitals}
              className="w-full bg-red-400 hover:bg-red-500 text-white py-2 rounded-md mt-2"
            >
              Save
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
