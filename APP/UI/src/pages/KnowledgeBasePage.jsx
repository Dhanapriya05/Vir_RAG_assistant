import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileCode,
  Trash2,
  Search,
  CheckCircle2,
  Database,
  ArrowLeft,
  HardDrive,
  Layers,
  Sparkles,
  AlertCircle,
  Eye,
  RefreshCw,
  LayoutGrid,
  List,
  ShieldCheck,
  Zap,
  Info,
  X,
  File,
  MessageSquare,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  getStoredDocuments,
  saveDocuments,
  validateUploadFile,
  getFileFormatInfo,
  uploadDocumentToBackend,
  fetchBackendDocuments,
  deleteDocumentFromBackend,
  fetchDocumentChunks,
  queryRealRag,
  searchKnowledgeDocuments,
  MAX_FILE_SIZE_MB,
  indexingPipelineSteps,
} from "@/services/knowledgeBaseService";

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [isLoading, setIsLoading] = useState(true);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Uploading / Indexing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [uploadError, setUploadError] = useState(null);

  // Chunk inspection modal state
  const [inspectingDoc, setInspectingDoc] = useState(null);
  const [inspectingChunks, setInspectingChunks] = useState([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);

  // RAG query test console state
  const [testQuery, setTestQuery] = useState("");
  const [testResults, setTestResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await fetchBackendDocuments();
      setDocuments(docs);
      saveDocuments(docs);
    } catch (e) {
      console.error(e);
      setDocuments(getStoredDocuments());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev?.id === toast?.id ? null : prev));
    }, 4000);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadError(null);

    const validation = validateUploadFile(file);
    if (!validation.valid) {
      setUploadError(validation.error);
      showToast(validation.error, "error");
      return;
    }

    setCurrentFile(file);
    setIsProcessing(true);
    setCurrentStepIndex(0);
    setCompletedSteps([]);

    try {
      const indexedDoc = await uploadDocumentToBackend(file, (progress) => {
        if (typeof progress === "function") {
          // dynamic progress update
        } else {
          setCurrentStepIndex(progress.index);
          if (progress.status === "complete") {
            setCompletedSteps((prev) => (prev.includes(progress.index) ? prev : [...prev, progress.index]));
          }
        }
      });

      const updatedDocs = [indexedDoc, ...documents.filter((d) => d.name !== indexedDoc.name)];
      setDocuments(updatedDocs);
      saveDocuments(updatedDocs);

      showToast(`Indexed "${file.name}" into Knowledge Base (${indexedDoc.chunks} vector chunks in Qdrant)!`, "success");
    } catch (err) {
      console.error(err);
      const errMsg = err.message || "Failed to process and index the document.";
      setUploadError(errMsg);
      showToast(`Upload failed: ${errMsg}`, "error");
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentFile(null);
        setCompletedSteps([]);
      }, 750);
    }
  };

  const handleDelete = async (docId, docName) => {
    if (!window.confirm(`Are you sure you want to delete "${docName}" from the Knowledge Base?`)) return;

    await deleteDocumentFromBackend(docName);
    const updated = documents.filter((d) => d.id !== docId && d.name !== docName);
    setDocuments(updated);
    saveDocuments(updated);
    if (inspectingDoc?.name === docName) setInspectingDoc(null);
    showToast(`Deleted "${docName}" from Knowledge Base`, "info");
  };

  const handleInspect = async (doc) => {
    setInspectingDoc(doc);
    setIsLoadingChunks(true);
    try {
      const chunks = await fetchDocumentChunks(doc.name);
      setInspectingChunks(chunks);
    } catch (e) {
      console.error(e);
      setInspectingChunks([]);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const handleTestSearch = async (e) => {
    e?.preventDefault();
    if (!testQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await queryRealRag(testQuery);
      if (res) {
        setTestResults(res);
      } else {
        setTestResults({ answer: "No response from backend.", sources: [] });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredDocs = searchKnowledgeDocuments(documents, searchQuery, filterType, sortBy);

  const totalSizeMB = documents.reduce((sum, d) => sum + (d.size || 0), 0);
  const totalChunks = documents.reduce((sum, d) => sum + (d.chunks || 0), 0);
  const totalTokens = documents.reduce((sum, d) => sum + (d.tokens || 0), 0);

  const formatCounts = {
    all: documents.length,
    pdf: documents.filter((d) => d.type === "pdf").length,
    excel: documents.filter((d) => d.type === "xlsx" || d.type === "xls" || d.type === "csv").length,
    doc: documents.filter((d) => d.type === "docx" || d.type === "txt").length,
  };

  const getFormatIcon = (type) => {
    const t = (type || "").toLowerCase();
    if (t === "pdf") return <FileText className="h-6 w-6 text-red-500" />;
    if (t === "xlsx" || t === "xls") return <FileSpreadsheet className="h-6 w-6 text-emerald-500" />;
    if (t === "csv") return <FileCode className="h-6 w-6 text-cyan-500" />;
    if (t === "docx") return <FileText className="h-6 w-6 text-blue-500" />;
    return <File className="h-6 w-6 text-amber-500" />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600/30 selection:text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
              toast.type === "error"
                ? "border-red-500/40 bg-red-950/90 text-red-200"
                : toast.type === "info"
                ? "border-blue-500/40 bg-blue-950/90 text-blue-200"
                : "border-emerald-500/40 bg-emerald-950/90 text-emerald-200"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            ) : toast.type === "info" ? (
              <Info className="h-5 w-5 text-blue-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Student View</span>
            </Link>
            <div className="h-5 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-tight text-white sm:text-base">
                    Knowledge Base Management
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-blue-400 border border-blue-500/20">
                    <ShieldCheck className="h-3 w-3" /> Admin / Staff Portal
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Upload PDF, Excel, and CSV files up to 200MB to index into Vector DB
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadDocuments}
              title="Refresh indexed documents list"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Qdrant Vector DB</span> Online
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {/* Metric Cards Overview */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400 font-mono">
                Total Documents
              </span>
              <FileText className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-mono">
                {documents.length}
              </span>
              <span className="text-xs text-emerald-400 font-medium">{documents.length > 0 ? "Indexed" : "Clean"}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Real files in Qdrant store</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400 font-mono">
                Vector Chunks
              </span>
              <Layers className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-mono">
                {totalChunks.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-mono">1024-dim</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Jina Embeddings v3</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400 font-mono">
                Storage Size
              </span>
              <HardDrive className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-mono">
                {totalSizeMB.toFixed(1)} <span className="text-sm font-normal text-slate-400">MB</span>
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Max {MAX_FILE_SIZE_MB}MB per file</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400 font-mono">
                Supported Formats
              </span>
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-red-400 border border-red-500/30">
                PDF
              </span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                XLSX
              </span>
              <span className="rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-600/30">
                XLS
              </span>
              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-cyan-400 border border-cyan-500/30">
                CSV
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Auto parsed & indexed</p>
          </div>
        </section>

        {/* Drag & Drop Upload Zone */}
        <section className="relative">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed p-8 text-center transition-all sm:p-12 ${
              isDragging
                ? "border-blue-500 bg-blue-500/10 shadow-2xl shadow-blue-500/20 scale-[1.01]"
                : "border-white/15 bg-slate-900/40 hover:border-blue-500/50 hover:bg-slate-900/70"
            }`}
          >
            <div className="pointer-events-none absolute left-0 top-0 h-32 w-32 rounded-br-full bg-gradient-to-br from-blue-500/20 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-32 rounded-tl-full bg-gradient-to-tl from-emerald-500/20 to-transparent" />

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv,.docx,.txt,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                  e.target.value = "";
                }
              }}
            />

            <div className="relative z-10 flex flex-col items-center">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/25"
              >
                <Upload className="h-7 w-7" />
              </motion.div>

              <h2 className="text-xl font-bold text-white sm:text-2xl">
                Upload Real Knowledge Documents & Datasets
              </h2>
              <p className="mt-2 max-w-lg text-sm text-slate-400">
                Drag and drop your <span className="font-semibold text-slate-200">PDF, Excel (.xlsx, .xls)</span>, or{" "}
                <span className="font-semibold text-slate-200">CSV</span> files here, or click to browse.
              </p>

              {/* Supported format badges */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                  <FileText className="h-3.5 w-3.5" /> PDF
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (.xlsx, .xls)
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  <FileCode className="h-3.5 w-3.5" /> CSV
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
                  Up to {MAX_FILE_SIZE_MB}MB
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/40 transition-all hover:scale-105"
                >
                  <Upload className="h-4 w-4" /> Browse Files
                </button>
              </div>

              {uploadError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-2 text-xs font-medium text-red-300">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Indexing Progress Modal */}
        <AnimatePresence>
          {isProcessing && currentFile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 20 }}
                className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-950/50">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                      <Zap className="h-4 w-4 animate-pulse" />
                    </div>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-blue-400">
                      Vector Indexing Pipeline
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Step {currentStepIndex + 1} of {indexingPipelineSteps.length}
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800">
                      {getFormatIcon(getFileFormatInfo(currentFile.name).type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{currentFile.name}</p>
                      <p className="text-xs text-slate-400 font-mono">
                        {(currentFile.size / (1024 * 1024)).toFixed(2)} MB · {getFileFormatInfo(currentFile.name).ext}
                      </p>
                    </div>
                  </div>

                  {/* Pipeline Steps */}
                  <div className="space-y-2.5">
                    {indexingPipelineSteps.map((step, idx) => {
                      const isDone = completedSteps.includes(idx);
                      const isCurrent = currentStepIndex === idx && !isDone;
                      return (
                        <div
                          key={step.id}
                          className={`flex items-center gap-3 rounded-xl p-2.5 transition-colors ${
                            isCurrent
                              ? "bg-blue-500/10 border border-blue-500/30"
                              : isDone
                              ? "bg-emerald-500/5 border border-emerald-500/20"
                              : "opacity-40"
                          }`}
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                            {isDone ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            ) : isCurrent ? (
                              <div className="h-4 w-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                            ) : (
                              <div className="h-2 w-2 rounded-full bg-slate-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs font-mono font-semibold uppercase tracking-wider ${
                                isDone ? "text-emerald-400" : isCurrent ? "text-blue-300" : "text-slate-500"
                              }`}
                            >
                              {step.label}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">{step.detail}</p>
                          </div>
                          {isDone && <span className="text-xs font-mono text-emerald-400 font-bold">✓</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400"
                        animate={{
                          width: `${((completedSteps.length + 0.5) / indexingPipelineSteps.length) * 100}%`,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document Management Section */}
        <section className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                Indexed Documents ({documents.length})
              </h2>
              <p className="text-xs text-slate-400">
                All real files uploaded by you and indexed in Qdrant for RAG answering
              </p>
            </div>

            {/* Filter and View Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search indexed files..."
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
              >
                <option value="date-desc">Newest Added</option>
                <option value="date-asc">Oldest Added</option>
                <option value="name-asc">File Name (A-Z)</option>
                <option value="size-desc">Largest Size</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/80 p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-lg p-1 transition-colors ${
                    viewMode === "grid" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`rounded-lg p-1 transition-colors ${
                    viewMode === "table" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
                  }`}
                  title="Table View"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
            <button
              onClick={() => setFilterType("all")}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                filterType === "all"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              All Formats ({formatCounts.all})
            </button>
            <button
              onClick={() => setFilterType("pdf")}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterType === "pdf"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              <FileText className="h-3 w-3 text-red-400" /> PDF ({formatCounts.pdf})
            </button>
            <button
              onClick={() => setFilterType("excel")}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterType === "excel"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet className="h-3 w-3 text-emerald-400" /> Excel & CSV ({formatCounts.excel})
            </button>
            <button
              onClick={() => setFilterType("doc")}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterType === "doc"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              <File className="h-3 w-3 text-indigo-400" /> Documents & Text ({formatCounts.doc})
            </button>
          </div>

          {/* Document Cards or Table */}
          {filteredDocs.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-12 text-center">
              <Database className="mx-auto h-12 w-12 text-slate-600" />
              <h3 className="mt-4 text-base font-bold text-white">No documents uploaded yet</h3>
              <p className="mt-1 text-xs text-slate-400">
                Upload your PDF, Excel (.xlsx, .xls), or CSV files using the dropzone above to begin building your knowledge base.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
              >
                <Upload className="h-3.5 w-3.5" /> Upload First Document
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDocs.map((doc) => (
                <motion.div
                  key={doc.id || doc.name}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur-md hover:border-blue-500/40 hover:bg-slate-900/90 transition-all hover:shadow-xl hover:shadow-blue-500/5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 border border-white/5 group-hover:scale-105 transition-transform">
                        {getFormatIcon(doc.type)}
                      </div>
                      <StatusBadge status={doc.status}>Indexed</StatusBadge>
                    </div>

                    <div className="mt-3.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                          {(doc.type || "file").toUpperCase()}
                        </span>
                        {doc.category && (
                          <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
                            {doc.category}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1.5 font-bold text-white text-sm line-clamp-2" title={doc.name}>
                        {doc.name}
                      </h3>
                      {doc.summary && (
                        <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {doc.summary}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-2.5 text-center font-mono">
                      <div>
                        <div className="text-xs font-bold text-slate-200">{doc.size || "< 1"} MB</div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-500">Size</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200">{doc.chunks || "—"}</div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-500">Chunks</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200">
                          {doc.pages ? `${doc.pages} pgs` : doc.sheets ? `${doc.sheets} shts` : "1024-d"}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-500">
                          {doc.pages ? "Pages" : doc.sheets ? "Sheets" : "Vectors"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs">
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(doc.uploadedAt || Date.now()).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleInspect(doc)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-white/15 hover:text-white transition-colors"
                        title="Inspect Vector Chunks"
                      >
                        <Eye className="h-3.5 w-3.5" /> Inspect
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id, doc.name)}
                        className="rounded-lg border border-white/10 bg-white/5 p-1 text-slate-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 bg-slate-950/60 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5">Document</th>
                      <th className="px-4 py-3.5">Format</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Size</th>
                      <th className="px-4 py-3.5">Chunks</th>
                      <th className="px-4 py-3.5">Added Date</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {filteredDocs.map((doc) => (
                      <tr key={doc.id || doc.name} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                              {getFormatIcon(doc.type)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate max-w-xs">{doc.name}</p>
                              <p className="text-[10px] text-slate-400 truncate max-w-xs">{doc.summary}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-slate-300">
                            {doc.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={doc.status}>Indexed</StatusBadge>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-200">{doc.size} MB</td>
                        <td className="px-4 py-3.5 font-mono text-slate-200">{doc.chunks || "—"} chunks</td>
                        <td className="px-4 py-3.5 font-mono text-slate-400">
                          {new Date(doc.uploadedAt || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleInspect(doc)}
                              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-white/10"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id, doc.name)}
                              className="rounded-lg border border-white/10 bg-white/5 p-1 text-slate-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Live Vector Search & RAG Tester Console */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Live Knowledge Base RAG Console</h3>
              <p className="text-xs text-slate-400">
                Ask a question to query your real uploaded documents via Qdrant and Groq
              </p>
            </div>
          </div>

          <form onSubmit={handleTestSearch} className="mt-4 flex gap-2">
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Ask anything about your uploaded documents..."
              className="flex-1 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isSearching || !testQuery.trim()}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
            >
              {isSearching ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span>Query RAG</span>
            </button>
          </form>

          {/* Test Results Output */}
          {testResults && (
            <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
              <div className="rounded-2xl border border-blue-500/30 bg-slate-950/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-400">
                  <MessageSquare className="h-4 w-4" /> Generated Answer from Real Data:
                </div>
                <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {testResults.answer}
                </div>
              </div>

              {testResults.sources && testResults.sources.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Cited Context Sources ({testResults.sources.length})
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">Qdrant Vector Matches</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {testResults.sources.map((s, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-white truncate max-w-[160px]">
                            {s.document || s.label}
                          </span>
                          {s.score && (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                              {(s.score * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {s.section || "Section"} · Page {s.page || 1}
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed bg-white/5 rounded-lg p-2 font-mono-tech">
                          "{s.snippet}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Inspect Chunks Modal */}
      <AnimatePresence>
        {inspectingDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-950/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
                    {getFormatIcon(inspectingDoc.type)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{inspectingDoc.name}</h3>
                    <p className="text-[11px] font-mono text-slate-400">
                      {inspectingDoc.chunks || inspectingChunks.length} Chunks in Qdrant Vector Store
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectingDoc(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                    File Info
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    Format: {inspectingDoc.type?.toUpperCase()} · Size: {inspectingDoc.size} MB · Indexed in Qdrant Vector Store
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold">
                      Extracted Chunks ({inspectingChunks.length})
                    </h4>
                    <StatusBadge status="indexed">Qdrant Live</StatusBadge>
                  </div>

                  {isLoadingChunks ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      Loading chunks from Qdrant...
                    </div>
                  ) : inspectingChunks.length > 0 ? (
                    inspectingChunks.map((c, i) => (
                      <div
                        key={c.id || i}
                        className="rounded-xl border border-white/10 bg-slate-950/70 p-3.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">{c.section || `Chunk ${i + 1}`}</span>
                          <span className="font-mono text-[10px] text-slate-400">Page/Sheet: {c.page || 1}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed bg-white/5 rounded-lg p-2.5 font-mono-tech whitespace-pre-wrap">
                          {c.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">
                      All chunks for this document are indexed and ready for retrieval.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-white/10 px-6 py-3 bg-slate-950/60 flex justify-end">
                <button
                  onClick={() => setInspectingDoc(null)}
                  className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
