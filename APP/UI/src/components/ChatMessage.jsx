import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Volume2, Sparkles, RotateCcw } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { speak, stopSpeaking } from "@/services/ttsService";
import VoiceVisualizer from "./VoiceVisualizer";

function AIIcon() {
  return (
    <div className="w-8 h-8 rounded-xl bg-gradient-college flex items-center justify-center shadow-sm shrink-0">
      <Sparkles className="w-4 h-4 text-white" />
    </div>
  );
}

export default function ChatMessage({ message }) {
  const { clearChat, setActiveSource } = useChat();
  const [speaking, setSpeaking] = useState(false);
  const speakRef = useRef(null);

  const isUser = message.role === "user";

  const toggleSpeak = () => {
    if (speaking) {
      speakRef.current?.cancel();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speakRef.current = speak(message.content, {
      onEnd: () => setSpeaking(false),
    });
  };

  React.useEffect(() => () => {
    speakRef.current?.cancel();
    stopSpeaking();
  }, []);

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="bg-gradient-college text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] shadow-sm">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      <AIIcon />
      <div className="min-w-0 flex-1">
        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
          <div className="md-content text-[15px]">
            <ReactMarkdown>{message.content || " "}</ReactMarkdown>
          </div>

          {/* not found action */}
          {message.found === false && !message.streaming && (
            <button
              onClick={clearChat}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Try another question
            </button>
          )}

          {/* source label */}
          {message.source && !message.streaming && (
            <button
              onClick={() => setActiveSource(message.source)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-100 px-2.5 py-1.5 rounded-full transition-colors"
            >
              📄 {message.source.label}
            </button>
          )}
        </div>

        {/* actions */}
        {!message.streaming && message.content && (
          <div className="flex items-center gap-3 mt-1.5 pl-1">
            <button
              onClick={toggleSpeak}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700 transition-colors"
            >
              {speaking ? (
                <>
                  <span className="text-blue-600">🔊 Speaking...</span>
                  <VoiceVisualizer active bars={4} />
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  Listen
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}