// components/Loader.tsx
"use client";
import React from "react";

export default function Loader({ label = "Generating your plan..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-16 h-16 rounded-full animate-pulse" style={{ background: "radial-gradient(circle at 30% 30%, rgba(255,200,230,0.9), rgba(200,150,255,0.45))", filter: "blur(6px)" }} />
      <div className="text-sm text-slate-600 font-lexend">{label}</div>
    </div>
  );
}
