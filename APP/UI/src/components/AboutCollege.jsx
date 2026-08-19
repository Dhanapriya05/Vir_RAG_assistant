import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, MessageSquareText, BookOpenCheck, Eye } from "lucide-react";
import { college } from "@/data/collegeData";

const trust = [
  { icon: ShieldCheck, title: "Accurate", desc: "Official college information.", color: "text-blue-600 bg-blue-50" },
  { icon: MessageSquareText, title: "Simple", desc: "Ask in your own words.", color: "text-amber-600 bg-amber-50" },
  { icon: BookOpenCheck, title: "Helpful", desc: "Clear, structured answers.", color: "text-emerald-600 bg-emerald-50" },
  { icon: Eye, title: "Transparent", desc: "Sources shown when relevant.", color: "text-rose-600 bg-rose-50" },
];

export default function AboutCollege() {
  return (
    <section id="about" className="mt-14 scroll-mt-20">
      <div className="card-soft p-6 sm:p-10 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900"
        >
          Your Digital <span className="text-gradient-college">Campus Companion</span>
        </motion.h2>
        <p className="text-slate-500 mt-3 max-w-2xl mx-auto leading-relaxed">
          College AI brings important campus information into one simple conversational experience.
          Instead of searching through multiple pages and documents, students can simply ask a
          question and get a clear answer — about{" "}
          <span className="font-semibold text-slate-700">{college.name}</span>.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-8 max-w-3xl mx-auto">
          {trust.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white border border-slate-200 rounded-2xl p-4"
            >
              <div className={`w-10 h-10 rounded-xl ${t.color} flex items-center justify-center mx-auto mb-2`}>
                <t.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{t.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}