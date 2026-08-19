import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText } from "lucide-react";

export default function SourcePreview({ source, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    if (source) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [source, onClose]);

  return (
    <AnimatePresence>
      {source && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-heading font-bold">
                <FileText className="w-4 h-4 text-blue-600" />
                Source
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="text-xs font-bold tracking-wide text-blue-600 uppercase mb-1">
                {source.label}
              </div>
              <div className="text-slate-900 font-semibold mb-3">{source.document}</div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-600 leading-relaxed">
                "{source.snippet}"
              </div>
              <p className="text-xs text-slate-400 mt-3">
                This answer is grounded in official college knowledge.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}