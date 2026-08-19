import React from "react";
import { motion } from "framer-motion";

// Animated frequency visualizer for voice input state
export default function VoiceVisualizer({ active = true, color = "#06B6D4", bars = 28 }) {
  return (
    <div className="flex h-16 items-center justify-center gap-1">
      {[...Array(bars)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          animate={
            active
              ? { height: [8, 8 + Math.random() * 44, 8] }
              : { height: 8 }
          }
          transition={{
            duration: 0.4 + Math.random() * 0.5,
            repeat: active ? Infinity : 0,
            ease: "easeInOut",
            delay: i * 0.03,
          }}
        />
      ))}
    </div>
  );
}