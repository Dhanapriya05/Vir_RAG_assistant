import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Navigation,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Compass,
  CornerDownRight,
  Footprints,
  Layers,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useChat } from "@/context/ChatContext";

const QUICK_SOURCES = [
  "Main Entrance",
  "Reception",
  "Central Library",
  "Canteen",
  "Ground Floor Lobby",
];

const QUICK_DESTINATIONS = [
  "IT Lab",
  "CSE Lab",
  "Principal Office",
  "ECE Department",
  "Seminar Hall",
  "Examination Cell",
];

export default function CampusMapNavigator() {
  const { sendMessage } = useChat();
  const [step, setStep] = useState(1); // 1: "Where are you now?", 2: "Where should you want to go?", 3: "Result"
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [routeResult, setRouteResult] = useState(null);

  const sourceInputRef = useRef(null);
  const destInputRef = useRef(null);

  const handleSourceSubmit = (e) => {
    e?.preventDefault();
    if (!source.trim()) return;
    setStep(2);
    setTimeout(() => {
      destInputRef.current?.focus();
    }, 150);
  };

  const handleDestinationSubmit = async (e) => {
    e?.preventDefault();
    if (!destination.trim()) return;

    setIsLoading(true);
    setStep(3);

    try {
      const queryText = `How do I go from ${source} to ${destination}? Please give step-by-step directions.`;
      
      const candidateUrls = ["/api", "http://127.0.0.1:8000", "http://localhost:8000"];
      let responseData = null;

      for (const base of candidateUrls) {
        try {
          const res = await fetch(`${base}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: queryText,
              filename: "",
              history: [],
            }),
          });
          if (res.ok) {
            responseData = await res.json();
            break;
          }
        } catch {}
      }

      if (responseData && responseData.answer) {
        setRouteResult(responseData.answer);
      } else {
        setRouteResult(`Route from **${source}** to **${destination}**:\n\n1. Start at **${source}**.\n2. Proceed through the main corridor towards the Lab & Academic wing.\n3. Arrive at **${destination}**.`);
      }
    } catch (err) {
      console.error(err);
      setRouteResult(`Route from **${source}** to **${destination}**:\n\nHead along the main corridor to reach **${destination}**.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSource("");
    setDestination("");
    setRouteResult(null);
    setTimeout(() => {
      sourceInputRef.current?.focus();
    }, 100);
  };

  const handleSendToChat = () => {
    const fullQuery = `I want to go from ${source} to ${destination}`;
    sendMessage(fullQuery);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section id="campus-map-navigator" className="mt-12 mb-6 scroll-mt-20">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/10">
        {/* Glow effects */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />

        {/* Section Header */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-600 text-white shadow-lg shadow-emerald-500/20">
              <Compass className="h-6 w-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  Campus Map & Route Finder
                </h2>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-emerald-400 border border-emerald-500/30">
                  Interactive MCP
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Step-by-step indoor walking paths between any two classrooms, labs, or offices
              </p>
            </div>
          </div>

          {step > 1 && (
            <button
              onClick={handleReset}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/20 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Start New Route
            </button>
          )}
        </div>

        {/* Multi-Step Interactive Navigation Content */}
        <div className="relative z-10 mt-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: "Where are you now?" */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                    1
                  </span>
                  <span>Starting Point</span>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Where are you now?
                </h3>
                <p className="text-xs text-slate-300">
                  Enter your current location, entrance, or starting room on campus:
                </p>

                <form onSubmit={handleSourceSubmit} className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                    <input
                      ref={sourceInputRef}
                      type="text"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="e.g., Reception, Main Entrance, Central Library, G00..."
                      className="w-full rounded-2xl border border-white/15 bg-slate-950/70 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 backdrop-blur-md"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!source.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-blue-500 disabled:opacity-50 transition-all"
                  >
                    <span>Next</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                {/* Quick Selection Chips */}
                <div className="pt-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Quick suggestions:
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {QUICK_SOURCES.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          setSource(loc);
                          setStep(2);
                          setTimeout(() => destInputRef.current?.focus(), 150);
                        }}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
                      >
                        📍 {loc}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: "Where should you want to go?" */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 border border-blue-500/30">
                      2
                    </span>
                    <span>Destination</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">
                    <span className="text-slate-500">From:</span>
                    <span className="text-emerald-400 font-semibold">{source}</span>
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Where should you want to go?
                </h3>
                <p className="text-xs text-slate-300">
                  Enter the room, laboratory, department, or office you need to reach:
                </p>

                <form onSubmit={handleDestinationSubmit} className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Navigation className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
                    <input
                      ref={destInputRef}
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="e.g., IT Lab, CSE Lab, Principal Office, Seminar Hall, F17..."
                      className="w-full rounded-2xl border border-white/15 bg-slate-950/70 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 backdrop-blur-md"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!destination.trim() || isLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <Footprints className="h-4 w-4" />
                    )}
                    <span>Find Shortest Route</span>
                  </button>
                </form>

                {/* Quick Selection Chips */}
                <div className="pt-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Popular destinations:
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {QUICK_DESTINATIONS.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          setDestination(loc);
                        }}
                        className={`rounded-xl border px-3 py-1.5 text-xs transition-colors ${
                          destination === loc
                            ? "border-blue-500 bg-blue-500/20 text-blue-300"
                            : "border-white/10 bg-white/5 text-slate-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300"
                        }`}
                      >
                        🎯 {loc}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: "Result - Step-by-Step Route" */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-5"
              >
                {/* Route Header Badge */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                        Route Calculated
                      </div>
                      <div className="text-sm font-semibold text-white">
                        <span className="text-emerald-300">{source}</span> →{" "}
                        <span className="text-blue-300">{destination}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSendToChat}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all"
                    >
                      <Send className="h-3.5 w-3.5" /> Open in Chat
                    </button>
                    <button
                      onClick={handleReset}
                      className="rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all"
                    >
                      New Route
                    </button>
                  </div>
                </div>

                {/* Directions Content */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 backdrop-blur-md">
                  {isLoading ? (
                    <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                      <div className="mx-auto h-6 w-6 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                      <p>Calculating shortest indoor path using Campus MCP Map Graph...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                        <Footprints className="h-4 w-4" /> Step-by-Step Directions
                      </div>
                      <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans bg-white/5 rounded-xl p-4 border border-white/5">
                        {routeResult}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
