import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { processingStages } from "@/services/documentService";

export default function ProcessingPipeline({ open, fileName, onComplete, onClose }) {
  const [currentStage, setCurrentStage] = useState(-1);
  const [completed, setCompleted] = useState([]);

  useEffect(() => {
    if (!open) {
      setCurrentStage(-1);
      setCompleted([]);
      return;
    }
    let cancelled = false;
    (async () => {
      for (let i = 0; i < processingStages.length; i++) {
        if (cancelled) return;
        setCurrentStage(i);
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
        if (cancelled) return;
        setCompleted((c) => [...c, i]);
      }
      await new Promise((r) => setTimeout(r, 400));
      if (!cancelled) onComplete?.();
    })();
    return () => { cancelled = true; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="w-full max-w-md overflow-hidden rounded-2xl glass-strong shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.2em] text-amber-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Building Knowledge Index
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="mb-4 truncate rounded-xl glass-light px-3 py-2 text-sm font-medium text-slate-200">
                {fileName}
              </div>

              <div className="space-y-2">
                {processingStages.map((stage, i) => {
                  const isDone = completed.includes(i);
                  const isCurrent = currentStage === i && !isDone;
                  return (
                    <motion.div
                      key={stage.id}
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: isDone || isCurrent ? 1 : 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                        {isDone ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          </motion.div>
                        ) : isCurrent ? (
                          <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-slate-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div
                          className="font-mono-tech text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: isDone ? "#34D399" : isCurrent ? "#FBBF24" : "#64748B" }}
                        >
                          {stage.label}
                        </div>
                        <div className="text-[10px] text-slate-500">{stage.detail}</div>
                      </div>
                      {isDone && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "auto" }}
                          className="font-mono-tech text-[9px] uppercase text-emerald-400"
                        >
                          ✓
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500"
                  animate={{ width: `${(completed.length / processingStages.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}