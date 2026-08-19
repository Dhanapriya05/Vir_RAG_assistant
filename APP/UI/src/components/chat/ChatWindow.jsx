import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, BookOpen, ListChecks, HelpCircle, Quote, Upload, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import AIOrb from "@/components/chat/AIOrb";
import RagPipeline from "@/components/chat/RagPipeline";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatComposer from "@/components/chat/ChatComposer";
import SourceInspector from "@/components/chat/SourceInspector";
import GlassCard from "@/components/ui/GlassCard";

const suggestedPrompts = [
  { label: "Summarize this document", icon: FileText },
  { label: "Explain Unit 1", icon: BookOpen },
  { label: "What are the important topics?", icon: ListChecks },
  { label: "Create exam questions", icon: HelpCircle },
  { label: "Find important definitions", icon: Quote },
];

export default function ChatWindow() {
  const { messages, appMode, ragStage, activeDoc, sendMessage } = useApp();
  const [inspectorSource, setInspectorSource] = useState(null);
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, appMode, ragStage]);

  const isEmpty = messages.length === 0;
  const processing = appMode === "streaming_rag_query";

  return (
    <div className="relative flex h-full flex-col">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {isEmpty ? (
          <EmptyState activeDoc={activeDoc} onPrompt={(p) => sendMessage(p)} onUpload={() => navigate("/documents")} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
            <AnimatePresence>
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} onSourceClick={setInspectorSource} />
              ))}
            </AnimatePresence>

            {processing && <ProcessingState stage={ragStage} />}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2 md:pb-6">
        <ChatComposer onAttach={() => navigate("/documents")} />
      </div>

      <SourceInspector source={inspectorSource} onClose={() => setInspectorSource(null)} />
    </div>
  );
}

function EmptyState({ activeDoc, onPrompt, onUpload }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
      <AIOrb size={180} />

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 text-2xl font-bold text-white sm:text-3xl"
      >
        What would you like to know?
      </motion.h2>
      <p className="mt-2 text-sm text-slate-400">
        Ask anything about your active document.
      </p>

      {activeDoc ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 flex items-center gap-2 rounded-full glass-light px-3 py-1.5"
        >
          <FileText className="h-3.5 w-3.5 text-red-400" />
          <span className="text-xs text-slate-300">{activeDoc.name}</span>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4"
        >
          <button
            onClick={onUpload}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20"
          >
            <Upload className="h-4 w-4" /> Upload Document
          </button>
        </motion.div>
      )}

      {/* Suggested prompts */}
      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestedPrompts.map((p, i) => (
          <motion.button
            key={p.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPrompt(p.label)}
            disabled={!activeDoc}
            className="group flex items-center gap-3 rounded-xl glass p-3 text-left transition-colors hover:border-red-500/20 disabled:opacity-40"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/15 to-amber-500/10">
              <p.icon className="h-4 w-4 text-red-400" />
            </div>
            <span className="text-sm font-medium text-slate-200">{p.label}</span>
            <Sparkles className="ml-auto h-3.5 w-3.5 text-slate-600 group-hover:text-red-400" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ProcessingState({ stage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="mt-1 shrink-0">
        <div className="rounded-xl glass-light p-1.5">
          <div className="h-7 w-7 animate-pulse rounded-lg bg-gradient-to-br from-red-500/30 to-amber-500/20" />
        </div>
      </div>
      <div className="flex-1 rounded-2xl rounded-tl-sm glass p-4">
        <div className="mb-3 flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.2em] text-amber-400">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-amber-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          {stage || "Searching your knowledge..."}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {/* Pipeline steps */}
          <div className="space-y-1.5">
            {["RETRIEVING KNOWLEDGE", "SEARCHING VECTOR INDEX", "RANKING SOURCES", "GENERATING RESPONSE"].map((s, i) => {
              const order = ["RETRIEVING KNOWLEDGE", "SEARCHING VECTOR INDEX", "RANKING SOURCES", "GENERATING RESPONSE"];
              const activeIdx = stage ? order.indexOf(stage) : -1;
              const done = activeIdx > i;
              const current = activeIdx === i;
              return (
                <div key={s} className="flex items-center gap-2">
                  <motion.div
                    className="h-2 w-2 rounded-full"
                    style={{ background: done ? "#10B981" : current ? "#F59E0B" : "rgba(255,255,255,0.1)" }}
                    animate={current ? { scale: [1, 1.4, 1] } : {}}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  />
                  <span
                    className="font-mono-tech text-[10px] uppercase tracking-wider"
                    style={{ color: done ? "#34D399" : current ? "#FBBF24" : "#64748B" }}
                  >
                    {s}
                  </span>
                </div>
              );
            })}
          </div>
          <RagPipeline activeStage={stage} />
        </div>
      </div>
    </motion.div>
  );
}