import React from "react";
import { motion } from "framer-motion";

// Animated glowing AI core orb for empty state
export default function AIOrb({ size = 180 }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer pulse rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{ borderColor: "rgba(239,68,68,0.25)" }}
          initial={{ width: size * 0.5, height: size * 0.5, opacity: 0.6 }}
          animate={{ width: size, height: size, opacity: 0 }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
        />
      ))}

      {/* Glow halo */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          background: "radial-gradient(circle, rgba(239,68,68,0.25), rgba(245,158,11,0.1) 40%, transparent 70%)",
          filter: "blur(20px)",
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Core sphere */}
      <motion.div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size * 0.55,
          height: size * 0.55,
          background: "linear-gradient(135deg, #1E293B, #0F172A)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "inset 0 0 30px rgba(239,68,68,0.3), 0 0 40px rgba(239,68,68,0.2)",
        }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Inner gradient core */}
        <motion.div
          className="rounded-full"
          style={{
            width: size * 0.22,
            height: size * 0.22,
            background: "linear-gradient(135deg, #EF4444, #F59E0B)",
            boxShadow: "0 0 24px rgba(239,68,68,0.6)",
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Orbiting dot */}
        <motion.div
          className="absolute h-2 w-2 rounded-full"
          style={{ background: "#06B6D4", boxShadow: "0 0 10px #06B6D4" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        >
          <div style={{ position: "absolute", top: -size * 0.32, left: -1 }} />
        </motion.div>
      </motion.div>

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full"
          style={{
            background: i % 2 ? "#F59E0B" : "#EF4444",
            left: `${50 + Math.cos((i / 6) * Math.PI * 2) * 42}%`,
            top: `${50 + Math.sin((i / 6) * Math.PI * 2) * 42}%`,
          }}
          animate={{ y: [0, -12, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}