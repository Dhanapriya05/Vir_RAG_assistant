import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Mic, Square, Send, X, ArrowUp } from "lucide-react";
import { useApp } from "@/context/AppContext";
import VoiceVisualizer from "@/components/chat/VoiceVisualizer";
import { isVoiceSupported, createRecognizer, createMockRecognizer } from "@/services/voiceService";

export default function ChatComposer({ onAttach }) {
  const { sendMessage, appMode, setAppMode, activeDoc, pushToast } = useApp();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognizerRef = useRef(null);
  const inputRef = useRef(null);

  const voiceActive = appMode === "voice_active";

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        e.preventDefault();
        onAttach?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const handleSend = () => {
    const value = (text || transcript).trim();
    if (!value) return;
    if (!activeDoc) {
      pushToast({ title: "No active document", description: "Select a document before asking a grounded question.", variant: "warning" });
      return;
    }
    sendMessage(value);
    setText("");
    setTranscript("");
  };

  const startVoice = () => {
    setListening(true);
    setAppMode("voice_active");
    setTranscript("");
    pushToast({ title: "Voice input enabled", description: "Listening...", variant: "info" });

    const onResult = (r) => setTranscript(r);
    const onEnd = () => {
      setListening(false);
      setAppMode("idle");
      recognizerRef.current = null;
    };

    if (isVoiceSupported()) {
      const rec = createRecognizer(onResult, onEnd);
      recognizerRef.current = rec;
      try {
        rec.start();
      } catch {
        // fallback to mock
        recognizerRef.current = createMockRecognizer(onResult, onEnd);
      }
    } else {
      recognizerRef.current = createMockRecognizer(onResult, onEnd);
    }
  };

  const stopVoice = () => {
    recognizerRef.current?.stop?.();
    setListening(false);
    setAppMode("idle");
  };

  const cancelVoice = () => {
    recognizerRef.current?.stop?.();
    setListening(false);
    setAppMode("idle");
    setTranscript("");
  };

  return (
    <div className="relative">
      {/* Voice listening overlay */}
      <AnimatePresence>
        {voiceActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-3 rounded-2xl glass-strong p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.2em] text-cyan-400">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {listening ? "Listening..." : "Voice Ready"}
              </div>
              <span className="font-mono-tech text-[9px] uppercase tracking-wider text-slate-500">
                {isVoiceSupported() ? "Web Speech API" : "Mock Mode"}
              </span>
            </div>
            <VoiceVisualizer active={listening} />
            {transcript && (
              <div className="mt-3 rounded-xl glass-light p-3 text-sm text-slate-200">
                {transcript}
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-cyan-400 align-middle" />
              </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={cancelVoice}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button
                onClick={stopVoice}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20"
              >
                <Square className="h-3 w-3" /> Stop Listening
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer bar */}
      <div className="flex items-end gap-2 rounded-2xl glass-strong p-2.5">
        {/* Left controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onAttach}
            title="Upload document (Ctrl+U)"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            onClick={voiceActive ? stopVoice : startVoice}
            title="Speak"
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
            style={voiceActive ? { background: "rgba(6,182,212,0.15)", color: "#22D3EE" } : { color: "#94A3B8" }}
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>

        {/* Input */}
        <textarea
          ref={inputRef}
          value={transcript || text}
          onChange={(e) => {
            if (transcript) setTranscript("");
            setText(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="Ask something about your document..."
          className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white placeholder-slate-500 focus:outline-none scrollbar-thin"
        />

        {/* Send */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleSend}
          disabled={!(text || transcript).trim()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-amber-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.4)] transition-opacity disabled:opacity-30 disabled:shadow-none"
          title="Send (Ctrl+Enter)"
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      </div>

      <div className="mt-1.5 px-2 text-center font-mono-tech text-[9px] uppercase tracking-wider text-slate-600">
        AI BOT can make mistakes. Verify important info. · Ctrl+Enter to send
      </div>
    </div>
  );
}