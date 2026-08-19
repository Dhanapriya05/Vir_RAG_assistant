const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function speak(text, options = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options.onEnd?.();
    return null;
  }

  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.onend = options.onEnd;
  utterance.onerror = options.onEnd;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export const processingStages = [
  { id: "buffer", label: "READING BUFFER", detail: "Loading file into memory" },
  { id: "extract", label: "EXTRACTING CONTENT", detail: "Parsing text & structure" },
  { id: "chunk", label: "CHUNKING", detail: "256 token windows" },
  { id: "embed", label: "GENERATING EMBEDDINGS", detail: "768-dim vectors" },
  { id: "index", label: "INDEXING VECTOR STORE", detail: "Building retrievable index" },
  { id: "ready", label: "INDEX READY", detail: "Knowledge activated" },
];

// Simulate document processing through all stages, calling onProgress per stage
export async function processDocument(file, onProgress) {
  for (let i = 0; i < processingStages.length; i++) {
    const stage = processingStages[i];
    onProgress({ stage, index: i, status: "processing" });
    await sleep(550 + Math.random() * 450);
    onProgress({ stage, index: i, status: "complete" });
  }
  // Build a realistic document object from the uploaded file
  const isPdf = file.type?.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
  const isDocx = file.name.toLowerCase().endsWith(".docx");
  const type = isPdf ? "pdf" : isDocx ? "docx" : "txt";
  const sizeMB = Math.max(0.1, (file.size || 102400) / (1024 * 1024));
  const pages = Math.max(1, Math.round(sizeMB * 4 + Math.random() * 6));
  const tokens = Math.round(pages * 380 + Math.random() * 200);
  const chunks = Math.round(tokens / 128);

  return {
    id: `doc_${Date.now()}`,
    name: file.name,
    type,
    size: Math.round(sizeMB * 10) / 10,
    pages,
    chunks,
    tokens,
    embeddingDimensions: 768,
    status: "indexed",
    uploadedAt: new Date().toISOString().slice(0, 10),
    active: false,
    color: "#EF4444",
  };
}