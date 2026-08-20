import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Square, Volume2 } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import VoiceVisualizer from "./VoiceVisualizer";

export default function ChatInput() {
  const { sendMessage, isBusy, isListening, isSpeaking, transcript, startListening, stopListening } = useChat();
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  // Sync spoken transcript to input field while listening
  useEffect(() => {
    if (isListening && transcript) {
      setText(transcript);
    }
  }, [isListening, transcript]);

  const submit = useCallback(
    (e) => {
      e?.preventDefault();
      if (!text.trim() || (isBusy && !isListening)) return;
      if (isListening) stopListening();
      sendMessage(text);
      setText("");
    },
    [text, isBusy, isListening, sendMessage, stopListening]
  );

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setText("");
      startListening(true);
    }
  };

  return (
    <div className="border-t border-slate-100 p-3 sm:p-4 bg-white/60 rounded-b-3xl">
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 mb-3 px-2 py-1 bg-blue-50/80 rounded-xl border border-blue-200/60"
          >
            <VoiceVisualizer />
            <span className="text-sm font-bold text-blue-700 animate-pulse">Listening... (Speak your question)</span>
            <button
              onClick={stopListening}
              className="ml-auto text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200"
            >
              Stop
            </button>
          </motion.div>
        )}
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 mb-2 px-2 text-xs font-semibold text-emerald-600"
          >
            <Volume2 className="w-4 h-4 animate-bounce" />
            <span>Speaking response through speaker...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isBusy && !isListening}
            placeholder={isListening ? "Listening to your voice..." : "Ask about courses, departments, faculty, placements, map..."}
            aria-label="Ask a question"
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-400 focus:bg-white focus:glow-focus rounded-2xl pl-4 pr-12 py-3.5 text-slate-900 placeholder:text-slate-400 text-[15px] outline-none transition-all disabled:opacity-60"
          />
        </div>

        <button
          type="button"
          onClick={handleMicClick}
          disabled={isBusy && !isListening}
          aria-label="Ask using your voice"
          title={isListening ? "Stop listening" : "Ask using your voice"}
          className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            isListening
              ? "bg-red-500 text-white shadow-md animate-pulse"
              : "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100 shadow-sm"
          } disabled:opacity-50`}
        >
          {isListening ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <motion.button
          type="submit"
          disabled={!text.trim() || (isBusy && !isListening)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          aria-label="Send message"
          className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-college text-white flex items-center justify-center shadow-md disabled:opacity-40 disabled:shadow-none"
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </form>
    </div>
  );
}