import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Hash, Target, Quote } from "lucide-react";

export default function SourceInspector({ source, onClose }) {
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const pct = source ? Math.round(source.similarity * 100) : 0;

  return (
    <AnimatePresence>
      {source && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl glass-strong shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.2em] text-red-400">
                <Target className="h-4 w-4" />
                Source Inspection
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Document */}
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-amber-400" />
                <div>
                  <div className="font-mono-tech text-[9px] uppercase tracking-wider text-slate-500">Document</div>
                  <div className="text-sm font-semibold text-white">{source.documentName}</div>
                </div>
              </div>

              {/* Page + Section grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl glass-light p-3">
                  <div className="font-mono-tech text-[9px] uppercase tracking-wider text-slate-500">Page</div>
                  <div className="mt-0.5 text-lg font-bold text-white">Page {source.page}</div>
                </div>
                <div className="rounded-xl glass-light p-3">
                  <div className="font-mono-tech text-[9px] uppercase tracking-wider text-slate-500">Section</div>
                  <div className="mt-0.5 text-sm font-semibold text-white">{source.section}</div>
                </div>
              </div>

              {/* Similarity */}
              <div className="rounded-xl glass-light p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono-tech text-[9px] uppercase tracking-wider text-slate-500">Similarity</span>
                  <span className="font-mono-tech text-sm font-bold text-emerald-400">{source.similarity.toFixed(2)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Retrieved text */}
              <div>
                <div className="mb-2 flex items-center gap-2 font-mono-tech text-[9px] uppercase tracking-wider text-slate-500">
                  <Quote className="h-3 w-3" /> Retrieved Text
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-sm leading-relaxed text-slate-300">{source.snippet}</p>
                </div>
              </div>

              {/* Footer badges */}
              <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                <span className="flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 font-mono-tech text-[9px] uppercase tracking-wider text-cyan-300">
                  <Hash className="h-3 w-3" /> Chunk #{source.chunkId}
                </span>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono-tech text-[9px] uppercase tracking-wider text-emerald-300">
                  Vector Match
                </span>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono-tech text-[9px] uppercase tracking-wider text-emerald-300">
                  {source.similarity.toFixed(2)} Cosine Similarity
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}