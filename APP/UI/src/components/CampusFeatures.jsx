import React from "react";
import { motion } from "framer-motion";
import { campusFeatures } from "@/data/collegeData";

export default function CampusFeatures() {
  return (
    <section className="mt-12">
      <div className="text-center mb-6">
        <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900">
          Everything You Need to Know About <span className="text-gradient-college">Campus</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {campusFeatures.map((f, i) => (
          <motion.div
            key={f.name}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
            className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl mb-2">
              {f.emoji}
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">{f.name}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
