import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import AIOrb from "./AIOrb";

export default function Hero() {
  return (
    <section id="top" className="pt-10 sm:pt-16 pb-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-1.5 bg-white border border-blue-100 text-blue-700 text-xs font-bold tracking-wide px-3.5 py-1.5 rounded-full shadow-sm"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        AI-POWERED CAMPUS ASSISTANT
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex justify-center my-6"
      >
        <AIOrb size={116} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="font-heading font-extrabold tracking-tight text-slate-900 text-3xl sm:text-5xl leading-[1.1]"
      >
        How can I help you{" "}
        <span className="text-gradient-college">today?</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="mt-4 text-slate-500 text-base sm:text-lg max-w-2xl mx-auto"
      >
        Ask me anything about your{" "}
        <span className="font-semibold text-blue-700">college</span>, departments, courses,
        facilities, placements, events and <span className="font-semibold text-blue-700">campus life</span>.
      </motion.p>
    </section>
  );
}
