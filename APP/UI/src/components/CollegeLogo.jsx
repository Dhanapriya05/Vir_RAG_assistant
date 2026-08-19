import React from "react";
import { motion } from "framer-motion";

export default function CollegeLogo({ size = 40, showText = true }) {
  return (
    <div className="flex items-center gap-2.5">
      <motion.div
        initial={{ rotate: -8, scale: 0.9 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 12 }}
        className="relative shrink-0"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
          <defs>
            <linearGradient id="clg-blue" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2563EB" />
              <stop offset="1" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          {/* robot head */}
          <rect x="9" y="14" width="30" height="22" rx="7" fill="url(#clg-blue)" />
          <rect x="9" y="14" width="30" height="22" rx="7" stroke="#1D4ED8" strokeWidth="1.2" />
          {/* antenna */}
          <rect x="23" y="7" width="2" height="7" rx="1" fill="#1D4ED8" />
          <circle cx="24" cy="6" r="2.4" fill="#EF4444" />
          {/* eyes */}
          <circle cx="18" cy="24" r="2.6" fill="#FACC15" />
          <circle cx="30" cy="24" r="2.6" fill="#FACC15" />
          {/* smile */}
          <path d="M18 30 Q24 33.5 30 30" stroke="#FACC15" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* graduation cap */}
          <path d="M24 9 L40 14 L24 19 L8 14 Z" fill="#0F172A" />
          <rect x="36" y="14" width="2.4" height="6" rx="1" fill="#0F172A" />
          <path d="M39.5 20 Q41 21 40 22.5" stroke="#FACC15" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
      </motion.div>
      {showText && (
        <div className="leading-none">
          <div className="font-heading font-extrabold tracking-tight text-slate-900 text-lg">
            COLLEGE <span className="text-gradient-college">AI</span>
          </div>
          <div className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 mt-0.5">
            SMART CAMPUS ASSISTANT
          </div>
        </div>
      )}
    </div>
  );
}
