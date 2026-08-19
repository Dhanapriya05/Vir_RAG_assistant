import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Boxes, Cpu, Database, Search } from "lucide-react";

const steps = [
  { label: "Documents", icon: FileText, color: "#EF4444" },
  { label: "Chunks", icon: Boxes, color: "#F59E0B" },
  { label: "Embeddings", icon: Cpu, color: "#06B6D4" },
  { label: "Vector Index", icon: Database, color: "#10B981" },
  { label: "AI Retrieval", icon: Search, color: "#EF4444" },
];

export default function KnowledgeIndexViz({ documentCount, chunkCount }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % steps.length), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-2xl glass p-4">
      <div className="mb-3 flex items-center gap-2 font-mono-tech text-[9px] uppercase tracking-[0.2em] text-slate-500">
        <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
        Knowledge Index Pipeline
      </div>
      <div className="flex items-center justify-between gap-1">
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <motion.div
              className="flex flex-1 flex-col items-center gap-1.5"
              animate={{ opacity: i === active ? 1 : 0.4 }}
            >
              <motion.div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: `${s.color}15`, border: `1px solid ${i === active ? s.color : "rgba(255,255,255,0.08)"}` }}
                animate={i === active ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </motion.div>
              <span className="text-center font-mono-tech text-[8px] uppercase tracking-wider text-slate-400">
                {s.label}
              </span>
            </motion.div>
            {i < steps.length - 1 && (
              <motion.div
                className="h-px w-4 shrink-0"
                style={{ background: i < active ? "#10B981" : "rgba(255,255,255,0.1)" }}
                animate={i === active - 1 ? { opacity: [0.3, 1, 0.3] } : {}}
                transition={{ duration: 0.6 }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
          <div className="font-mono-tech text-lg font-bold text-white">{documentCount}</div>
          <div className="font-mono-tech text-[8px] uppercase tracking-wider text-slate-500">Documents</div>
        </div>
        <div className="rounded-lg bg-white/5 px-3 py-2 text-center">
          <div className="font-mono-tech text-lg font-bold text-white">{chunkCount}</div>
          <div className="font-mono-tech text-[8px] uppercase tracking-wider text-slate-500">Total Chunks</div>
        </div>
      </div>
    </div>
  );
}