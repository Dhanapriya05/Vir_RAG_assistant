import React, { useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Volume2, Square, AlertTriangle, Shield, Globe, Sparkles } from "lucide-react";
import Logo from "@/components/brand/Logo";
import SourceCitation from "@/components/chat/SourceCitation";
import { useApp } from "@/context/AppContext";
import { speak, isTtsSupported } from "@/services/ttsService";

export default function ChatMessage({ message, onSourceClick }) {
  const { setKnowledgeMode, activeDoc } = useApp();
  const [speaking, setSpeaking] = useState(false);
  const [utter, setUtter] = useState(null);
  const isUser = message.role === "user";

  const handleSpeak = () => {
    if (speaking) {
      utter?.cancel?.();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    const u = speak(message.content, {
      onEnd: () => setSpeaking(false),
    });
    setUtter(u);
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-slate-700/80 to-slate-800/80 border border-white/10 px-4 py-3">
          <p className="text-sm leading-relaxed text-slate-100">{message.content}</p>
          <div className="mt-1.5 text-right font-mono-tech text-[9px] text-slate-500">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </motion.div>
    );
  }

  // Assistant message
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      {/* Avatar */}
      <div className="mt-1 shrink-0">
        <div className="rounded-xl glass-light p-1.5">
          <Logo size={28} animated={false} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-sm glass px-4 py-3">
          {/* Out of scope guardrail */}
          {message.type === "out_of_scope" && (
            <ScopeGuardrail onSwitch={() => setKnowledgeMode("general")} />
          )}

          {/* Regular content */}
          {message.type !== "out_of_scope" && message.content && (
            <div className="md-content max-w-none text-sm">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
              <span className="font-mono-tech text-[9px] uppercase tracking-wider text-slate-500">Sources</span>
              {message.sources.map((s) => (
                <SourceCitation key={s.id} source={s} onClick={onSourceClick} />
              ))}
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold text-emerald-300">
                [{Math.round((message.sources[0].similarity || 0) * 100)}% match]
              </span>
            </div>
          )}

          {/* Greeting starter prompts */}
          {message.type === "greeting" && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
              {["Summarize this document", "Explain the most important topics", "Create questions from this document"].map((p) => (
                <GreetingPrompt key={p} prompt={p} />
              ))}
            </div>
          )}
        </div>

        {/* Footer: confidence + TTS */}
        <div className="mt-2 flex items-center gap-3 px-1">
          {/* Confidence */}
          {message.confidence && (
            <div className="flex items-center gap-2">
              <div className="relative h-7 w-7">
                <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
                  <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                  <motion.circle
                    cx="14" cy="14" r="11" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray={69}
                    initial={{ strokeDashoffset: 69 }}
                    animate={{ strokeDashoffset: 69 - (69 * message.confidence) }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono-tech text-[8px] font-bold text-emerald-400">
                  {Math.round(message.confidence * 100)}%
                </span>
              </div>
              <span className="font-mono-tech text-[9px] uppercase tracking-wider text-slate-500">
                Retrieval Match
              </span>
            </div>
          )}

          {/* Mode indicator */}
          {message.mode === "general" && (
            <span className="flex items-center gap-1 font-mono-tech text-[9px] uppercase tracking-wider text-cyan-400">
              <Globe className="h-3 w-3" /> General Knowledge
            </span>
          )}

          {/* TTS */}
          {message.content && message.type !== "out_of_scope" && (
            <button
              onClick={handleSpeak}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors hover:bg-white/5"
              style={{ color: speaking ? "#22D3EE" : "#94A3B8" }}
            >
              {speaking ? (
                <>
                  <span className="flex items-center gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-0.5 rounded-full bg-cyan-400"
                        animate={{ height: [4, 12, 4] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                  Speaking
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" /> Listen
                </>
              )}
            </button>
          )}

          <span className="ml-auto font-mono-tech text-[9px] text-slate-600">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function GreetingPrompt({ prompt }) {
  const { sendMessage } = useApp();
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => sendMessage(prompt)}
      className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-red-500/15 hover:text-white"
    >
      <Sparkles className="h-3 w-3 text-red-400" /> {prompt}
    </motion.button>
  );
}

function ScopeGuardrail({ onSwitch }) {
  const { sendMessage } = useApp();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
    >
      <div className="flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.2em] text-amber-400">
        <AlertTriangle className="h-4 w-4" /> Outside Document Scope
      </div>
      <p className="mt-2 text-sm text-slate-300">
        This topic is not covered in the active document. Switch context to General Knowledge to search outside this file.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => sendMessage("Stay in document")}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
        >
          <Shield className="h-3.5 w-3.5" /> Stay in Document
        </button>
        <button
          onClick={onSwitch}
          className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20"
        >
          <Globe className="h-3.5 w-3.5" /> Switch to General Knowledge
        </button>
      </div>
    </motion.div>
  );
}