import React from "react";
import { motion } from "framer-motion";

// Clickable citation badge
export default function SourceCitation({ source, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(source)}
      className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
      title={`Page ${source.page} · ${source.section} · ${(source.similarity * 100).toFixed(0)}% match`}
    >
      [Page {source.page}]
    </motion.button>
  );
}