import React from "react";
import { motion } from "framer-motion";

export default function VoiceVisualizer({ active = true, bars = 5 }) {
  const colors = ["#2563EB", "#FACC15", "#EF4444", "#2563EB", "#F59E0B"];
  return (
    <div className="flex items-end justify-center gap-1 h-8">
      {[...Array(bars)].map((_, i) => (
        <motion.span
          key={i}
          className="w-1.5 rounded-full"
          style={{ background: colors[i % colors.length], height: 8 }}
          animate={active ? { height: [8, 26, 12, 22, 8] } : { height: 8 }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
