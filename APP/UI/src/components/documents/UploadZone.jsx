import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, FileType2, FileCode } from "lucide-react";
import GlowButton from "@/components/ui/GlowButton";

const supported = [
  { ext: "PDF", desc: "Portable Document Format", icon: FileText, color: "#EF4444" },
  { ext: "DOCX", desc: "Microsoft Word", icon: FileType2, color: "#06B6D4" },
  { ext: "TXT", desc: "Plain Text", icon: FileCode, color: "#F59E0B" },
];

export default function UploadZone({ onFile }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (files) => {
    if (files && files[0]) onFile(files[0]);
  };

  return (
    <div>
      {/* Dropzone */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        animate={dragging ? { scale: 1.01 } : { scale: 1 }}
        className="relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-12"
        style={{
          borderColor: dragging ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)",
          background: dragging ? "rgba(239,68,68,0.05)" : "rgba(15,23,42,0.5)",
        }}
      >
        {/* Glowing corners */}
        <div className="pointer-events-none absolute left-0 top-0 h-20 w-20 rounded-br-full" style={{ background: "radial-gradient(circle at top left, rgba(239,68,68,0.25), transparent 70%)" }} />
        <div className="pointer-events-none absolute bottom-0 right-0 h-20 w-20 rounded-tl-full" style={{ background: "radial-gradient(circle at bottom right, rgba(245,158,11,0.25), transparent 70%)" }} />

        {/* Animated dashed border shimmer */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ boxShadow: dragging ? "inset 0 0 30px rgba(239,68,68,0.15)" : "none" }}
        />

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-amber-500/10"
        >
          <Upload className="h-7 w-7 text-red-400" />
        </motion.div>

        <h3 className="text-xl font-bold text-white sm:text-2xl">Drop your knowledge here</h3>
        <p className="mt-1 font-mono-tech text-xs uppercase tracking-wider text-slate-500">
          PDF · DOCX · TXT
        </p>

        <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <GlowButton onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} size="md">
            <Upload className="h-4 w-4" /> Browse Files
          </GlowButton>
          <span className="text-xs text-slate-500">or drag & drop your documents</span>
        </div>
      </motion.div>

      {/* Supported formats */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {supported.map((s, i) => (
          <motion.div
            key={s.ext}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3 rounded-xl glass-light p-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: `${s.color}15` }}>
              <s.icon className="h-5 w-5" style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{s.ext}</div>
              <div className="text-[11px] text-slate-500">{s.desc}</div>
            </div>
          </motion.div>
        ))}
        <div className="flex items-center gap-3 rounded-xl glass-light p-3 opacity-40">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
            <FileText className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-400">XLSX</div>
            <div className="text-[11px] text-slate-600">Coming soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}