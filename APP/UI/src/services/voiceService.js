// Speech Recognition Service using browser Web Speech API

const getSpeechRecognition = () =>
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

export function isVoiceSupported() {
  return Boolean(getSpeechRecognition());
}

export function createRecognizer({ onResult, onEnd, onError, continuous = false }) {
  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) return null;

  const recognizer = new SpeechRecognition();
  recognizer.lang = "en-US";
  recognizer.interimResults = true;
  recognizer.continuous = continuous;
  recognizer.maxAlternatives = 1;

  let finalTranscript = "";

  recognizer.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interim += transcript;
      }
    }
    const current = finalTranscript || interim;
    if (current && onResult) {
      onResult(current, Boolean(finalTranscript));
    }
  };

  recognizer.onend = () => {
    if (onEnd) onEnd(finalTranscript);
  };

  recognizer.onerror = (event) => {
    console.warn("Speech recognition error event:", event.error);
    if (onError) onError(event.error);
    if (onEnd) onEnd(finalTranscript);
  };

  return recognizer;
}

export function createMockRecognizer({ onResult, onEnd }) {
  const timer = setTimeout(() => {
    if (onResult) onResult("What courses are offered?", true);
    if (onEnd) onEnd("What courses are offered?");
  }, 1200);

  return {
    start() {},
    stop() {
      clearTimeout(timer);
      if (onEnd) onEnd("");
    },
  };
}