import React from "react";
import { motion } from "framer-motion";

// AI BOT logo — geometric robot node with gradient power core
export default function Logo({ size = 40, animated = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="coreGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Antenna */}
      <line x1="24" y1="3" x2="24" y2="8" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24" cy="3" r="1.8" fill="url(#coreGrad)" />

      {/* Head outline */}
      <rect x="8" y="8" width="32" height="26" rx="7" stroke="#1E293B" strokeWidth="2" fill="#0F172A" />
      {/* Side nodes */}
      <circle cx="6" cy="21" r="2.5" fill="#1E293B" />
      <circle cx="42" cy="21" r="2.5" fill="#1E293B" />

      {/* Eyes / visor */}
      <rect x="13" y="14" width="22" height="8" rx="3" fill="#0B1120" stroke="#1E293B" strokeWidth="1" />
      {animated && (
        <motion.rect
          x="15"
          y="16"
          width="4"
          height="4"
          rx="1"
          fill="url(#coreGrad)"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {!animated && <rect x="15" y="16" width="4" height="4" rx="1" fill="url(#coreGrad)" />}
      <rect x="29" y="16" width="4" height="4" rx="1" fill="url(#coreGrad)" />

      {/* Power core */}
      <motion.circle
        cx="24"
        cy="29"
        r="3.5"
        fill="url(#coreGrad)"
        filter="url(#glow)"
        animate={animated ? { scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] } : {}}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Body */}
      <rect x="14" y="36" width="20" height="8" rx="3" stroke="#1E293B" strokeWidth="2" fill="#0F172A" />
      <line x1="18" y1="40" x2="30" y2="40" stroke="url(#coreGrad)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className="flex flex-col leading-none">
      <div className="flex items-baseline gap-0.5 text-lg font-extrabold tracking-tight">
        <span className="text-red-500">AI</span>
        <span className="text-white">BOT</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 font-mono-tech text-[8px] uppercase tracking-[0.2em] text-slate-500">
        <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
        Intelligent System
      </div>
    </div>
  );
}