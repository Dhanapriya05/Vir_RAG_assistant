import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { askCollegeAI, welcomeMessage } from "@/services/aiService";

const ChatContext = createContext(null);

const thinkingStages = [
  "Searching Vector Database...",
  "Retrieving relevant document chunks...",
  "Generating response from real data...",
];

let idCounter = 0;
const uid = () => `m${++idCounter}_${Date.now()}`;

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState(() => [
    { id: uid(), role: "ai", content: welcomeMessage.content, source: null, sources: [], followups: [], found: true, streaming: false },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStage, setThinkingStage] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [activeSource, setActiveSource] = useState(null);
  const streamTimer = useRef(null);

  const isBusy = isThinking || messages.some((m) => m.streaming);

  const stopStream = useCallback(() => {
    if (streamTimer.current) {
      clearInterval(streamTimer.current);
      streamTimer.current = null;
    }
  }, []);

  const sendMessage = useCallback(
    async (text, filename = "") => {
      const trimmed = text.trim();
      if (!trimmed || isBusy) return;

      stopStream();
      const userMsg = { id: uid(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);

      setIsThinking(true);
      setThinkingStage(0);
      const s1 = setTimeout(() => setThinkingStage(1), 600);
      const s2 = setTimeout(() => setThinkingStage(2), 1200);

      // Build history
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role === "ai" ? "assistant" : m.role,
        content: m.content,
      }));

      const result = await askCollegeAI(trimmed, historyPayload, filename);
      clearTimeout(s1);
      clearTimeout(s2);

      setIsThinking(false);
      setThinkingStage(0);

      const msgId = uid();
      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          role: "ai",
          content: "",
          source: result.source,
          sources: result.sources || [],
          followups: result.followups || [],
          found: result.found,
          streaming: true,
        },
      ]);

      const tokens = result.content.match(/\S+\s*/g) || [result.content];
      let i = 0;
      streamTimer.current = setInterval(() => {
        i += 3;
        const partial = tokens.slice(0, i).join("");
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: partial } : m))
        );
        if (i >= tokens.length) {
          clearInterval(streamTimer.current);
          streamTimer.current = null;
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, content: result.content, streaming: false } : m))
          );
        }
      }, 18);
    },
    [isBusy, messages, stopStream]
  );

  const clearChat = useCallback(() => {
    stopStream();
    setIsThinking(false);
    setThinkingStage(0);
    setMessages([
      { id: uid(), role: "ai", content: welcomeMessage.content, source: null, sources: [], followups: [], found: true, streaming: false },
    ]);
  }, [stopStream]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isThinking,
        thinkingStage,
        thinkingStages,
        isBusy,
        isListening,
        setIsListening,
        activeSource,
        setActiveSource,
        sendMessage,
        clearChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
