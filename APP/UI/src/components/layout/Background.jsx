import React from "react";

// Subtle layered background with radial glows + animated grid
export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #070B12 0%, #0F172A 100%)" }}
      />
      {/* Animated grid */}
      <div className="absolute inset-0 grid-bg animate-grid-pan opacity-40" />
      {/* Radial glows */}
      <div
        className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, rgba(239,68,68,0.18), transparent 60%)", filter: "blur(40px)" }}
      />
      <div
        className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full opacity-25"
        style={{ background: "radial-gradient(circle, rgba(245,158,11,0.15), transparent 60%)", filter: "blur(40px)" }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[450px] w-[450px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.12), transparent 60%)", filter: "blur(50px)" }}
      />
      <div
        className="absolute -bottom-20 right-1/4 h-[350px] w-[350px] rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, rgba(30,58,138,0.2), transparent 60%)", filter: "blur(40px)" }}
      />
    </div>
  );
}
