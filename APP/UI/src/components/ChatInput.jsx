import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Square } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { isVoiceSupported, createRecognizer, createMockRecognizer } from "@/services/voiceService";
import VoiceVisualizer from "./VoiceVisualizer";

export default function ChatInput() {
  const { sendMessage, isBusy, isListening, setIsListening } = useChat();
  const [text, setText] = useState("");
  const recognizerRef = useRef(null);
  const inputRef = useRef(null);

  const submit = useCallback(
    (e) => {
      e?.preventDefault();
      if (!text.trim() || isBusy) return;
      sendMessage(text);
      setText("");
    },
    [text, isBusy, sendMessage]
  );

  const stopListening = useCallback(() => {
    if (recognizerRef.current?.stop) recognizerRef.current.stop();
    recognizerRef.current = null;
    setIsListening(false);
  }, [setIsListening]);

  const startListening = useCallback(() => {
    if (isBusy) return;
    setText("");
    setIsListening(true);
    const onResult = (t) => setText(t);
    const onEnd = () => {
      setIsListening(false);
      recognizerRef.current = null;
    };
    if (isVoiceSupported()) {
      const r = createRecognizer(onResult, onEnd);
      recognizerRef.current = r;
      r?.start();
    } else {
      recognizerRef.current = createMockRecognizer(onResult, onEnd);
    }
  }, [isBusy, setIsListening]);

  const handleMicClick = () => {
    if (isListening) stopListening();
    else startListening();
  };

  return (
    <div className="border-t border-slate-100 p-3 sm:p-4 bg-white/60 rounded-b-3xl">
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 mb-3 px-2"
          >
            <VoiceVisualizer />
            <span className="text-sm font-semibold text-blue-700">Listening...</span>
            <button
              onClick={stopListening}
              className="ml-auto text-xs font-semibold text-slate-500 hover:text-red-500"
            >
              Cancel
            </button>
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
            disabled={isBusy}
            placeholder="Ask about your college..."
            aria-label="Ask a question"
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-400 focus:bg-white focus:glow-focus rounded-2xl pl-4 pr-12 py-3.5 text-slate-900 placeholder:text-slate-400 text-[15px] outline-none transition-all disabled:opacity-60"
          />
        </div>

        <button
          type="button"
          onClick={handleMicClick}
          disabled={isBusy && !isListening}
          aria-label="Ask using your voice"
          title="Ask using your voice"
          className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            isListening
              ? "bg-red-500 text-white shadow-md"
              : "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100"
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