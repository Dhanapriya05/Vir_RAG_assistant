// Knowledge Base Service integrated with the FastAPI Backend (Qdrant Vector DB, Jina Embeddings, Groq LLM)

const CANDIDATE_URLS = [
  "/api",
  "http://127.0.0.1:8000",
  "http://localhost:8000",
];

async function apiFetch(path, options = {}) {
  let lastErr = null;
  for (const base of CANDIDATE_URLS) {
    try {
      const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status !== 404 && res.status !== 502 && res.status !== 503) {
        return res; // Return error response for handling (e.g., 400 validation error)
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Backend connection failed");
}

const STORAGE_KEY = "vrag_knowledge_base_docs";

export const MAX_FILE_SIZE_MB = 200;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const SUPPORTED_EXTENSIONS = [
  { ext: "PDF", label: "PDF Documents", exts: [".pdf"], mime: "application/pdf", color: "#EF4444" },
  { ext: "XLSX", label: "Excel Spreadsheets (.xlsx)", exts: [".xlsx"], mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", color: "#10B981" },
  { ext: "XLS", label: "Excel 97-2004 (.xls)", exts: [".xls"], mime: "application/vnd.ms-excel", color: "#059669" },
  { ext: "CSV", label: "Comma Separated Values (.csv)", exts: [".csv"], mime: "text/csv", color: "#06B6D4" },
  { ext: "DOCX", label: "Word Documents (.docx)", exts: [".docx"], mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", color: "#3B82F6" },
  { ext: "TXT", label: "Plain Text (.txt)", exts: [".txt"], mime: "text/plain", color: "#F59E0B" },
];

export function getStoredDocuments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDocuments(docs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (err) {
    console.error("Failed to save knowledge base documents to localStorage", err);
  }
}

export function validateUploadFile(file) {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  // Size validation: up to 200MB
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum limit of ${MAX_FILE_SIZE_MB} MB.`,
    };
  }

  // Extension validation
  const name = file.name.toLowerCase();
  const allowedExtensions = [".pdf", ".xlsx", ".xls", ".csv", ".docx", ".txt"];
  const matchedExt = allowedExtensions.find((ext) => name.endsWith(ext));

  if (!matchedExt) {
    return {
      valid: false,
      error: `Unsupported file format. Supported formats: PDF (.pdf), Excel (.xlsx, .xls), CSV (.csv), DOCX (.docx), and TXT (.txt).`,
    };
  }

  return { valid: true, extension: matchedExt };
}

export function getFileFormatInfo(filename) {
  const name = (filename || "").toLowerCase();
  if (name.endsWith(".pdf")) return { type: "pdf", ...SUPPORTED_EXTENSIONS[0] };
  if (name.endsWith(".xlsx")) return { type: "xlsx", ...SUPPORTED_EXTENSIONS[1] };
  if (name.endsWith(".xls")) return { type: "xls", ...SUPPORTED_EXTENSIONS[2] };
  if (name.endsWith(".csv")) return { type: "csv", ...SUPPORTED_EXTENSIONS[3] };
  if (name.endsWith(".docx")) return { type: "docx", ...SUPPORTED_EXTENSIONS[4] };
  return { type: "txt", ...SUPPORTED_EXTENSIONS[5] };
}

export const indexingPipelineSteps = [
  { id: "read", label: "UPLOADING FILE", detail: "Uploading file stream to FastAPI backend" },
  { id: "parse", label: "EXTRACTING TEXT & SHEETS", detail: "Parsing pages, worksheets & tables" },
  { id: "chunk", label: "SEMANTIC CHUNKING", detail: "Generating 256-token contextual windows" },
  { id: "embed", label: "JINA 1024-DIM EMBEDDINGS", detail: "Generating dense vector representations" },
  { id: "index", label: "INDEXING IN QDRANT", detail: "Storing embeddings into Qdrant vector database" },
  { id: "indexed", label: "INDEXED & READY", detail: "Document activated for live RAG queries" },
];

/**
 * Upload and index a document through the real backend API.
 */
export async function uploadDocumentToBackend(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  // Notify initial progress
  onProgress?.({ step: indexingPipelineSteps[0], index: 0, status: "processing" });

  const progressInterval = setInterval(() => {
    // Increment visual steps while waiting for backend
    onProgress?.((prev) => {
      const nextIdx = Math.min(indexingPipelineSteps.length - 2, (prev?.index || 0) + 1);
      return { step: indexingPipelineSteps[nextIdx], index: nextIdx, status: "processing" };
    });
  }, 700);

  try {
    const response = await apiFetch("/upload", {
      method: "POST",
      body: formData,
    });

    clearInterval(progressInterval);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();

    // Final step complete
    onProgress?.({
      step: indexingPipelineSteps[indexingPipelineSteps.length - 1],
      index: indexingPipelineSteps.length - 1,
      status: "complete",
    });

    const formatInfo = getFileFormatInfo(file.name);
    const sizeMB = Math.max(0.01, Number((file.size / (1024 * 1024)).toFixed(2)));

    const newDoc = {
      id: `kb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: data.filename || file.name,
      type: formatInfo.type,
      extension: formatInfo.exts ? formatInfo.exts[0] : `.${formatInfo.type}`,
      size: data.size_mb || sizeMB,
      sizeBytes: file.size,
      pages: data.pages_or_sheets || null,
      chunks: data.chunks_stored || 0,
      tokens: (data.chunks_stored || 0) * 128,
      embeddingDimensions: 1024,
      status: "indexed",
      category: data.document_type || "Indexed Document",
      uploadedAt: new Date().toISOString(),
      summary: `Indexed ${formatInfo.type.toUpperCase()} file containing ${data.chunks_stored || 0} vector chunks in Qdrant.`,
      suggested_questions: data.suggested_questions || [],
    };

    return newDoc;
  } catch (err) {
    clearInterval(progressInterval);
    console.error("Backend upload error:", err);
    throw err;
  }
}

/**
 * Fetch documents list from backend.
 */
export async function fetchBackendDocuments() {
  try {
    const response = await apiFetch("/documents");
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.documents)) {
        return data.documents.map((d) => ({
          ...d,
          category: getFileFormatInfo(d.name).type.toUpperCase(),
          embeddingDimensions: 1024,
          status: "indexed",
          uploadedAt: typeof d.uploadedAt === "number" ? new Date(d.uploadedAt).toISOString() : d.uploadedAt || new Date().toISOString(),
          summary: `Stored ${d.type?.toUpperCase()} file (${d.size} MB) indexed in vector database.`,
        }));
      }
    }
  } catch (e) {
    console.warn("Could not fetch remote documents list from backend:", e);
  }
  return getStoredDocuments();
}

/**
 * Delete a document from backend.
 */
export async function deleteDocumentFromBackend(filename) {
  try {
    const response = await apiFetch(`/documents/${encodeURIComponent(filename)}`, {
      method: "DELETE",
    });
    return response.ok;
  } catch (e) {
    console.error(`Failed to delete document ${filename} on backend:`, e);
    return false;
  }
}

/**
 * Fetch real chunks from backend for inspection modal.
 */
export async function fetchDocumentChunks(filename) {
  try {
    const response = await apiFetch(`/documents/${encodeURIComponent(filename)}/chunks`);
    if (response.ok) {
      const data = await response.json();
      return data.chunks || [];
    }
  } catch (e) {
    console.error(`Failed to fetch chunks for ${filename}:`, e);
  }
  return [];
}

/**
 * Query real RAG backend.
 */
export async function queryRealRag(question, filename = "") {
  try {
    const response = await apiFetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, filename: filename || "", history: [] }),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error("Query RAG error:", e);
  }
  return null;
}

export function searchKnowledgeDocuments(docs, query, filterType = "all", sortBy = "date-desc") {
  let filtered = [...docs];

  if (filterType !== "all") {
    if (filterType === "pdf") {
      filtered = filtered.filter((d) => d.type === "pdf");
    } else if (filterType === "excel") {
      filtered = filtered.filter((d) => d.type === "xlsx" || d.type === "xls" || d.type === "csv");
    } else if (filterType === "doc") {
      filtered = filtered.filter((d) => d.type === "docx" || d.type === "txt");
    }
  }

  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.category && d.category.toLowerCase().includes(q)) ||
        (d.summary && d.summary.toLowerCase().includes(q))
    );
  }

  // Sort
  if (sortBy === "date-desc") {
    filtered.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  } else if (sortBy === "date-asc") {
    filtered.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
  } else if (sortBy === "name-asc") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "size-desc") {
    filtered.sort((a, b) => b.size - a.size);
  }

  return filtered;
}
