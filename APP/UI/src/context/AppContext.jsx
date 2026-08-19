import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { mockDocuments } from "@/data/mockDocuments";
import { ragQuery, buildGreeting } from "@/services/ragService";

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }) {
  const [documents, setDocuments] = useState(mockDocuments);
  const [activeDocId, setActiveDocId] = useState(mockDocuments[0].id);
  const [messages, setMessages] = useState([]);
  const [appMode, setAppMode] = useState("idle");
  const [knowledgeMode, setKnowledgeMode] = useState("document"); // "document" | "general"
  const [toasts, setToasts] = useState([]);
  const [ragStage, setRagStage] = useState(null); // current pipeline stage label
  const [commandOpen, setCommandOpen] = useState(false);
  const toastId = useRef(0);

  const activeDoc = documents.find((d) => d.id === activeDocId) || null;

  const pushToast = useCallback((toast) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { ...toast, id }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, toast.duration || 3500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const addDocument = useCallback((doc) => {
    setDocuments((prev) => [doc, ...prev]);
  }, []);

  const removeDocument = useCallback((id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setActiveDocId((curr) => {
      if (curr === id) {
        const remaining = documents.filter((d) => d.id !== id);
        return remaining[0]?.id || null;
      }
      return curr;
    });
  }, [documents]);

  const activateDocument = useCallback((id) => {
    setActiveDocId(id);
    const doc = documents.find((d) => d.id === id);
    if (doc) {
      pushToast({ title: "Document activated", description: doc.name, variant: "success" });
    }
  }, [documents, pushToast]);

  const clearChat = useCallback(() => {
    setMessages([]);
    pushToast({ title: "Chat cleared", description: "Conversation reset", variant: "info" });
  }, [pushToast]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    const userMsg = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setAppMode("streaming_rag_query");

    // Animate RAG pipeline stages
    const stages = ["RETRIEVING KNOWLEDGE", "SEARCHING VECTOR INDEX", "RANKING SOURCES", "GENERATING RESPONSE"];
    for (let i = 0; i < stages.length; i++) {
      setRagStage(stages[i]);
      await new Promise((r) => setTimeout(r, 380));
    }

    const result = await ragQuery(text, activeDoc, knowledgeMode);
    setRagStage(null);

    let aiContent = "";
    let aiSources = [];
    let aiConfidence = null;
    let aiType = result.type;

    if (result.type === "out_of_scope") {
      aiContent = "";
    } else if (result.type === "no_match") {
      aiContent = `### No matching content found\n\nI couldn't find a relevant passage in **${activeDoc?.name}** for that question. Try rephrasing, or switch to **General Knowledge** mode to search beyond this document.`;
    } else {
      aiContent = result.content;
      aiSources = result.sources || [];
      aiConfidence = result.confidence;
    }

    const aiMsg = {
      id: `msg_${Date.now() + 1}`,
      role: "assistant",
      content: aiContent,
      timestamp: new Date().toISOString(),
      sources: aiSources,
      confidence: aiConfidence,
      type: aiType,
      mode: result.mode,
    };
    setMessages((prev) => [...prev, aiMsg]);
    setAppMode("idle");
  }, [activeDoc, knowledgeMode]);

  const greetAfterUpload = useCallback((doc) => {
    const greeting = buildGreeting(doc);
    const aiMsg = {
      id: `msg_greet_${Date.now()}`,
      role: "assistant",
      content: greeting.content,
      timestamp: new Date().toISOString(),
      sources: [],
      confidence: null,
      type: "greeting",
      mode: "document",
    };
    setMessages([aiMsg]);
  }, []);

  const value = {
    documents,
    activeDoc,
    activeDocId,
    activateDocument,
    addDocument,
    removeDocument,
    messages,
    sendMessage,
    clearChat,
    appMode,
    setAppMode,
    knowledgeMode,
    setKnowledgeMode,
    toasts,
    pushToast,
    dismissToast,
    ragStage,
    commandOpen,
    setCommandOpen,
    greetAfterUpload,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}