import React from "react";
import { motion } from "framer-motion";
import { FileText, Trash2, Zap, MessageSquare, ExternalLink, CheckCircle2 } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { useApp } from "@/context/AppContext";

const typeColors = { pdf: "#EF4444", docx: "#06B6D4", txt: "#F59E0B" };

export default function DocumentCard({ doc, onAsk }) {
  const { activateDocument, removeDocument, activeDocId, pushToast } = useApp();
  const isActive = activeDocId === doc.id;

  const handleDelete = () => {
    removeDocument(doc.id);
    pushToast({ title: "Document removed", description: doc.name, variant: "info" });
  };

  const handleActivate = () => activateDocument(doc.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3 }}
      className="relative overflow-hidden rounded-2xl glass p-4"
      style={isActive ? { borderColor: "rgba(239,68,68,0.3)" } : undefined}
    >
      {isActive && (
        <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full" style={{ background: "radial-gradient(circle, rgba(239,68,68,0.2), transparent 70%)" }} />
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: `${typeColors[doc.type]}15` }}>
          <FileText className="h-6 w-6" style={{ color: typeColors[doc.type] }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white">{doc.name}</div>
          <div className="mt-0.5 flex items-center gap-2 font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">
            <span>{doc.type.toUpperCase()}</span>
            <span>·</span>
            <span>{doc.size} MB</span>
          </div>
        </div>
        {isActive && (
          <span className="flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-red-300">
            <CheckCircle2 className="h-2.5 w-2.5" /> Active
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Tokens" value={doc.tokens.toLocaleString()} />
        <Stat label="Chunks" value={doc.chunks} />
        <Stat label="Dims" value={doc.embeddingDimensions} />
      </div>

      {/* Status + date */}
      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={doc.status}>{doc.status === "indexed" ? "Indexed" : doc.status}</StatusBadge>
        <span className="font-mono-tech text-[10px] text-slate-600">
          {new Date(doc.uploadedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
        {!isActive && (
          <button
            onClick={handleActivate}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
          >
            <Zap className="h-3.5 w-3.5" /> Activate
          </button>
        )}
        <button
          onClick={() => onAsk?.(doc)}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
        >
          <MessageSquare className="h-3.5 w-3.5" /> Ask AI
        </button>
        <button
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </button>
        <button
          onClick={handleDelete}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:border-red-500/30 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5 text-center">
      <div className="font-mono-tech text-xs font-bold text-slate-200">{value}</div>
      <div className="font-mono-tech text-[8px] uppercase tracking-wider text-slate-600">{label}</div>
    </div>
  );
}