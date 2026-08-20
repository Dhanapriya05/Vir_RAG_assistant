// Text-to-Speech Service using browser Web Speech API

export function cleanSpeechText(md) {
  if (!md) return "";
  return md
    .replace(/```[\s\S]*?```/g, "")           // Remove code blocks
    .replace(/`([^`]+)`/g, "$1")               // Inline code
    .replace(/#{1,6}\s+/g, "")                 // Markdown headers
    .replace(/\*\*([^*]+)\*\*/g, "$1")         // Bold
    .replace(/\*([^*]+)\*/g, "$1")             // Italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")   // Links
    .replace(/^[-*•]\s+/gm, "")                // Bullet points
    .replace(/^\d+\.\s+/gm, "")                // Numbered lists
    .replace(/[_~>|]/g, "")                    // Misc markdown symbols
    .replace(/\s+/g, " ")                      // Normalize whitespace
    .trim();
}

export function speak(text, options = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options.onEnd?.();
    return null;
  }

  stopSpeaking();

  const cleaned = cleanSpeechText(text);
  if (!cleaned) {
    options.onEnd?.();
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = options.rate || 1.0;
  utterance.pitch = options.pitch || 1.0;
  utterance.lang = options.lang || "en-US";

  // Pick an articulate English voice if available
  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = voices.find(
    (v) => (v.lang.startsWith("en") || v.lang.startsWith("en-IN")) && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))
  ) || voices.find((v) => v.lang.startsWith("en"));

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.onend = () => {
    options.onEnd?.();
  };

  utterance.onerror = (e) => {
    console.warn("TTS playback encountered an error or was interrupted:", e);
    options.onEnd?.();
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis invocation failed:", err);
    options.onEnd?.();
  }

  return utterance;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}