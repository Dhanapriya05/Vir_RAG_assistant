import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Trash2, MoreHorizontal, FileText, Volume2, VolumeX } from "lucide-react";
import { useApp } from "@/context/AppContext";
import StatusBadge from "@/components/ui/StatusBadge";

export default function Header({ title }) {
  const { activeDoc, clearChat, appMode, knowledgeMode, setKnowledgeMode } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/5 glass px-4 py-3 sm:px-6">
      {/* Left — title */}
      <div className="min-w-0">
        <h1 className="truncate text-base font-bold text-white sm:text-lg">{title}</h1>
        <div className="hidden items-center gap-2 font-mono-tech text-[10px] uppercase tracking-wider text-slate-500 sm:flex">
          <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
          {appMode === "streaming_rag_query" ? "Processing query" : appMode === "voice_active" ? "Voice active" : "System online"}
        </div>
      </div>

      {/* Center/right — active context pill */}
      <div className="flex items-center gap-2 sm:gap-3">
        {activeDoc ? (
          <div className="hidden items-center gap-2 rounded-full glass-light px-3 py-1.5 sm:flex">
            <FileText className="h-3.5 w-3.5 text-red-400" />
            <span className="max-w-[160px] truncate text-xs font-medium text-slate-200">
              {activeDoc.name}
            </span>
            <StatusBadge status="indexed">Indexed</StatusBadge>
          </div>
        ) : (
          <div className="hidden rounded-full glass-light px-3 py-1.5 text-xs text-slate-500 sm:flex">
            No document
          </div>
        )}

        {/* Knowledge mode toggle */}
        <button
          onClick={() => setKnowledgeMode(knowledgeMode === "document" ? "general" : "document")}
          className="flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors"
          style={
            knowledgeMode === "general"
              ? { borderColor: "rgba(6,182,212,0.4)", background: "rgba(6,182,212,0.1)", color: "#22D3EE" }
              : { borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#F87171" }
          }
          title="Toggle knowledge scope"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: knowledgeMode === "general" ? "#22D3EE" : "#EF4444" }} />
          {knowledgeMode === "general" ? "General Knowledge" : "Document Only"}
        </button>

        {/* Voice status */}
        <div
          className="hidden items-center gap-1.5 rounded-full glass-light px-2.5 py-1.5 text-[10px] font-mono-tech uppercase tracking-wider md:flex"
          style={{ color: appMode === "voice_active" ? "#22D3EE" : "#64748B" }}
        >
          {appMode === "voice_active" ? <Volume2 className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {appMode === "voice_active" ? "Listening" : appMode === "speaking" ? "Speaking" : "Voice"}
        </div>

        {/* Clear chat */}
        <button
          onClick={clearChat}
          className="flex h-9 w-9 items-center justify-center rounded-xl glass-light text-slate-400 transition-colors hover:text-red-400"
          title="Clear chat"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {/* More menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl glass-light text-slate-400 transition-colors hover:text-white"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-11 z-20 w-48 rounded-xl glass-strong p-1.5 text-sm shadow-2xl"
                >
                  <button
                    onClick={() => { clearChat(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-300 hover:bg-white/5"
                  >
                    <Trash2 className="h-4 w-4" /> Clear conversation
                  </button>
                  <div className="px-3 py-2 font-mono-tech text-[9px] uppercase tracking-wider text-slate-500">
                    User-free system · No auth
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
