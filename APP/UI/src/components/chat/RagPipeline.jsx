import React from "react";
import { motion } from "framer-motion";

const stages = [
  { label: "QUERY", desc: "User input" },
  { label: "EMBEDDING", desc: "768-dim vector" },
  { label: "VECTOR SEARCH", desc: "Cosine similarity" },
  { label: "TOP-K RETRIEVAL", desc: "Ranked chunks" },
  { label: "CONTEXT ASSEMBLY", desc: "Prompt build" },
  { label: "LLM RESPONSE", desc: "Grounded answer" },
];

export default function RagPipeline({ activeStage }) {
  // activeStage is one of the human-readable stage labels from context, or null
  const stageOrder = [
    "RETRIEVING KNOWLEDGE",
    "SEARCHING VECTOR INDEX",
    "RANKING SOURCES",
    "GENERATING RESPONSE",
  ];
  const activeIdx = activeStage ? stageOrder.indexOf(activeStage) : -1;

  return (
    <div className="rounded-xl glass-light p-3">
      <div className="mb-2 flex items-center gap-2 font-mono-tech text-[9px] uppercase tracking-[0.2em] text-slate-500">
        <span className="h-1 w-1 rounded-full bg-red-400 animate-pulse" />
        RAG Pipeline
      </div>
      <div className="space-y-1">
        {stages.map((s, i) => {
          const isActive = activeIdx >= 0 && i <= activeIdx;
          const isCurrent =
            activeStage && i === Math.min(activeIdx + 1, stages.length - 1);
          return (
            <div key={s.label} className="flex items-center gap-2">
              <motion.div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono-tech text-[9px]"
                style={{
                  background: isActive ? "rgba(16,185,129,0.15)" : isCurrent ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? "rgba(16,185,129,0.4)" : isCurrent ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.08)"}`,
                  color: isActive ? "#34D399" : isCurrent ? "#FBBF24" : "#64748B",
                }}
                animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.8, repeat: isCurrent ? Infinity : 0 }}
              >
                {i + 1}
              </motion.div>
              <div className="flex-1">
                <div
                  className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: isActive ? "#34D399" : isCurrent ? "#FBBF24" : "#94A3B8" }}
                >
                  {s.label}
                </div>
              </div>
              {isActive && <span className="text-emerald-400 text-[10px]">✓</span>}
              {isCurrent && (
                <motion.span
                  className="h-1 w-1 rounded-full bg-amber-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}