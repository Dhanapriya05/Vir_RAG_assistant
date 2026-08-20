import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { askCollegeAI, welcomeMessage } from "@/services/aiService";
import { speak, stopSpeaking } from "@/services/ttsService";
import { createRecognizer, createMockRecognizer, isVoiceSupported } from "@/services/voiceService";

const ChatContext = createContext(null);

const thinkingStages = [
  "Understanding your request...",
  "Searching college knowledge base & records...",
  "Synthesizing accurate response...",
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [activeSource, setActiveSource] = useState(null);
  const [continuousVoiceMode, setContinuousVoiceMode] = useState(false);
  const [visitorSessionId, setVisitorSessionId] = useState(() => `session_${Date.now()}`);
  const [personDetected, setPersonDetected] = useState(false);
  const [welcomePlayed, setWelcomePlayed] = useState(false);

  const streamTimer = useRef(null);
  const recognizerRef = useRef(null);
  const continuousModeRef = useRef(false);

  useEffect(() => {
    continuousModeRef.current = continuousVoiceMode;
  }, [continuousVoiceMode]);

  const isBusy = isThinking || isSpeaking || messages.some((m) => m.streaming);

  const stopStream = useCallback(() => {
    if (streamTimer.current) {
      clearInterval(streamTimer.current);
      streamTimer.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop?.();
      } catch {}
      recognizerRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback((autoTriggered = false) => {
    stopSpeaking();
    stopStream();
    stopListening();

    setTranscript("");
    setIsListening(true);
    if (autoTriggered) {
      setContinuousVoiceMode(true);
    }

    const onResult = (text, isFinal) => {
      setTranscript(text);
      if (isFinal && text.trim()) {
        stopListening();
        sendMessage(text.trim());
      }
    };

    const onEnd = (finalText) => {
      setIsListening(false);
      recognizerRef.current = null;
      if (finalText && finalText.trim()) {
        sendMessage(finalText.trim());
      }
    };

    const onError = () => {
      setIsListening(false);
      recognizerRef.current = null;
    };

    try {
      if (isVoiceSupported()) {
        const r = createRecognizer({ onResult, onEnd, onError });
        recognizerRef.current = r;
        r?.start();
      } else {
        const r = createMockRecognizer({ onResult, onEnd });
        recognizerRef.current = r;
        r?.start();
      }
    } catch (err) {
      console.warn("Failed to initialize voice recognition:", err);
      setIsListening(false);
    }
  }, [stopListening, stopStream]);

  const triggerGreeting = useCallback((honorific = "Sir/Mam") => {
    const greetingText = `## 🎓 Welcome to P.T. Lee Chengalvaraya Naicker College of Engineering and Technology! 🌟

✨ **We’re delighted to have you here!**

Welcome to our college website, your gateway to **learning, innovation, technology, and opportunities.** 🚀

💬 **How can I help you today ${honorific}?**`;

    setMessages((prev) => {
      if (prev.length <= 1) {
        return [
          {
            id: uid(),
            role: "ai",
            content: greetingText,
            source: null,
            sources: [],
            followups: ["What courses are available?", "Tell me about the IT department", "Where is the IT Lab?", "Placements & Training"],
            found: true,
            streaming: false
          },
        ];
      }
      return prev;
    });

    setWelcomePlayed(true);
    setPersonDetected(true);
    setContinuousVoiceMode(true);
    setIsSpeaking(true);

    const spokenPrompt = `Welcome to P.T. Lee Chengalvaraya Naicker College of Engineering and Technology! We are delighted to have you here. How can I help you today ${honorific}?`;

    speak(spokenPrompt, {
      onEnd: () => {
        setIsSpeaking(false);
        // Automatically start listening for visitor question after greeting
        setTimeout(() => {
          startListening(true);
        }, 400);
      },
    });
  }, [startListening]);

  const resetVisitorSession = useCallback(() => {
    setVisitorSessionId(`session_${Date.now()}`);
    setPersonDetected(false);
    setWelcomePlayed(false);
    setContinuousVoiceMode(false);
    stopSpeaking();
    stopListening();
  }, [stopListening]);

  const sendMessage = useCallback(
    async (text, filename = "") => {
      const trimmed = text.trim();
      if (!trimmed) return;

      stopStream();
      stopSpeaking();
      stopListening();

      const userMsg = { id: uid(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);

      setIsThinking(true);
      setThinkingStage(0);
      const s1 = setTimeout(() => setThinkingStage(1), 500);
      const s2 = setTimeout(() => setThinkingStage(2), 1100);

      // Build recent conversation history
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

          // Automatically speak AI answer through laptop speakers
          setIsSpeaking(true);
          speak(result.content, {
            onEnd: () => {
              setIsSpeaking(false);
              // Continuous voice loop: automatically listen again if continuous mode active
              if (continuousModeRef.current) {
                setTimeout(() => {
                  startListening(true);
                }, 500);
              }
            },
          });
        }
      }, 16);
    },
    [messages, stopListening, stopStream, startListening]
  );

  const clearChat = useCallback(() => {
    stopStream();
    stopSpeaking();
    stopListening();
    setIsThinking(false);
    setIsSpeaking(false);
    setThinkingStage(0);
    setMessages([
      { id: uid(), role: "ai", content: welcomeMessage.content, source: null, sources: [], followups: [], found: true, streaming: false },
    ]);
  }, [stopStream, stopListening]);

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
        isSpeaking,
        transcript,
        activeSource,
        setActiveSource,
        continuousVoiceMode,
        setContinuousVoiceMode,
        visitorSessionId,
        personDetected,
        setPersonDetected,
        welcomePlayed,
        setWelcomePlayed,
        resetVisitorSession,
        startListening,
        stopListening,
        sendMessage,
        triggerGreeting,
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

