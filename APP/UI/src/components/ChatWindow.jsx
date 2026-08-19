import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/context/ChatContext";
import { quickChips } from "@/data/collegeData";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

function ThinkingIndicator({ stage, stages }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-2.5"
    >
      <div className="w-8 h-8 rounded-xl bg-gradient-college flex items-center justify-center shadow-sm shrink-0">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <motion.p
          key={stage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-medium text-slate-600"
        >
          {stages[stage]}
        </motion.p>
      </div>
    </motion.div>
  );
}

export default function ChatWindow() {
  const { messages, isThinking, thinkingStage, thinkingStages, sendMessage, isBusy } = useChat();
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  const showChips = messages.length === 1 && !isThinking;

  return (
    <div id="chat" className="card-soft overflow-hidden flex flex-col scroll-mt-20">
      {/* header strip */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-sm font-bold text-slate-900">College AI Assistant</span>
        </div>
        <span className="text-xs font-semibold text-slate-400">Always here to help</span>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-5 py-5 space-y-4 min-h-[340px] max-h-[52vh]">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}

        <AnimatePresence>
          {isThinking && <ThinkingIndicator stage={thinkingStage} stages={thinkingStages} />}
        </AnimatePresence>

        {/* quick chips */}
        <AnimatePresence>
          {showChips && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pt-2"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5">
                Quick questions
              </p>
              <div className="flex flex-wrap gap-2">
                {quickChips.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => sendMessage(chip.query)}
                    className="group inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-sm font-semibold px-3 py-2 rounded-full transition-all"
                  >
                    <span>{chip.emoji}</span>
                    {chip.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ChatInput />
    </div>
  );
}
