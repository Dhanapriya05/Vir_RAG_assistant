import React from "react";
import { motion } from "framer-motion";

export default function AIOrb({ size = 120 }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* pulse rings */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border-2 border-blue-400/40"
          style={{ margin: "auto", width: size, height: size }}
          animate={{ scale: [0.8, 1.7], opacity: [0.5, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
        />
      ))}

      {/* glow halo */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(37,99,235,0.35), rgba(250,204,21,0.18) 55%, transparent 70%)" }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* core */}
      <motion.div
        className="absolute inset-0 m-auto rounded-full"
        style={{
          width: size * 0.62,
          height: size * 0.62,
          background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
          boxShadow: "0 0 30px rgba(37,99,235,0.5), inset 0 0 20px rgba(255,255,255,0.25)",
        }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* inner yellow glow */}
        <motion.div
          className="absolute inset-0 m-auto rounded-full"
          style={{
            width: size * 0.34,
            height: size * 0.34,
            background: "radial-gradient(circle, #FACC15 0%, #F59E0B 70%, transparent 100%)",
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* white center */}
        <div
          className="absolute inset-0 m-auto rounded-full bg-white"
          style={{ width: size * 0.14, height: size * 0.14, boxShadow: "0 0 12px rgba(255,255,255,0.9)" }}
        />
        {/* red accent */}
        <motion.span
          className="absolute rounded-full bg-red-500"
          style={{ width: size * 0.08, height: size * 0.08, top: "18%", right: "20%" }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* floating particles */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const r = size * 0.46;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              width: 5,
              height: 5,
              left: "50%",
              top: "50%",
              background: i % 3 === 0 ? "#EF4444" : i % 3 === 1 ? "#FACC15" : "#2563EB",
            }}
            animate={{
              x: [Math.cos(angle) * r, Math.cos(angle) * r * 1.12, Math.cos(angle) * r],
              y: [Math.sin(angle) * r, Math.sin(angle) * r * 1.12, Math.sin(angle) * r],
              opacity: [0.4, 0.9, 0.4],
            }}
            transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
}
