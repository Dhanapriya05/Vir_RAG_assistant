import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, PanelRightClose, PanelRightOpen, HelpCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { chatFaqPrompts } from "@/data/faqData";

export default function ChatFaqPanel() {
  const { sendMessage, activeDoc } = useApp();
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-full flex-col">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between rounded-xl glass-light px-3 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5"
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-amber-400" />
          Frequently Asked
        </span>
        {open ? <PanelRightClose className="h-4 w-4 text-slate-500" /> : <PanelRightOpen className="h-4 w-4 text-slate-500" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              <p className="px-1 font-mono-tech text-[9px] uppercase tracking-wider text-slate-600">
                Quick Prompts
              </p>
              {chatFaqPrompts.map((p, i) => (
                <motion.button
                  key={p}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => activeDoc && sendMessage(p)}
                  disabled={!activeDoc}
                  className="group flex w-full items-center gap-2 rounded-xl glass-light px-3 py-2.5 text-left text-sm text-slate-300 transition-colors hover:border-amber-500/20 hover:text-white disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-amber-400/60 group-hover:text-amber-400" />
                  <span className="flex-1">{p}</span>
                </motion.button>
              ))}
            </div>

            {/* Active doc info */}
            {activeDoc && (
              <div className="mt-4 rounded-xl glass-light p-3">
                <div className="font-mono-tech text-[9px] uppercase tracking-wider text-slate-600">
                  Active Document
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-200">{activeDoc.name}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Pages" value={activeDoc.pages} />
                  <Stat label="Chunks" value={activeDoc.chunks} />
                  <Stat label="Tokens" value={activeDoc.tokens.toLocaleString()} />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 p-2">
      <div className="font-mono-tech text-sm font-bold text-white">{value}</div>
      <div className="font-mono-tech text-[8px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}