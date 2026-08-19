import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Navigation, ArrowLeft, FileText, RotateCcw } from "lucide-react";
import { mapLocations, mapPeople, getDirections } from "@/data/collegeData";

export default function MapAssistant({ open, onClose }) {
  const [step, setStep] = useState("from"); // from -> to -> result
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);

  useEffect(() => {
    if (open) {
      setStep("from");
      setFrom(null);
      setTo(null);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const result = from && to ? getDirections(from, to) : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-blue-50/50">
              <div className="flex items-center gap-2 font-heading font-bold text-slate-900">
                <Navigation className="w-5 h-5 text-blue-600" />
                Campus Directions
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto scrollbar-thin">
              <AnimatePresence mode="wait">
                {/* Step 1: where are you now */}
                {step === "from" && (
                  <motion.div
                    key="from"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">1</span>
                      <h3 className="font-bold text-slate-900">Where are you now?</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-4 pl-9">Select your current location on campus.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {mapLocations.map((loc) => (
                        <button
                          key={loc}
                          onClick={() => {
                            setFrom(loc);
                            setStep("to");
                          }}
                          className={`flex items-center gap-2 text-left text-sm font-semibold px-3 py-3 rounded-xl border transition-all ${
                            from === loc
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                          }`}
                        >
                          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                          {loc}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: whom to see */}
                {step === "to" && (
                  <motion.div
                    key="to"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">2</span>
                      <h3 className="font-bold text-slate-900">Whom do you want to see?</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-4 pl-9">Select the person you want to meet.</p>
                    <div className="space-y-2">
                      {mapPeople.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setTo(p.id);
                            setStep("result");
                          }}
                          className="w-full flex items-center justify-between text-left px-3.5 py-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all"
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.block} · {p.floor}</div>
                          </div>
                          <Navigation className="w-4 h-4 text-slate-300" />
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setStep("from")}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-blue-700"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                  </motion.div>
                )}

                {/* Step 3: result */}
                {step === "result" && result && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Navigation className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-slate-900">Your exact designation</h3>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-1">
                        From {from}
                      </div>
                      <div className="font-heading font-bold text-slate-900 text-lg">{result.person.name}</div>
                      <div className="text-sm text-slate-600">{result.person.block} · {result.person.floor} · {result.person.room}</div>
                    </div>
                    <ol className="mt-4 space-y-2.5">
                      {[
                        `Start at **${from}**.`,
                        from.toLowerCase().includes(result.person.block.split(" ")[0].toLowerCase())
                          ? `You're already at the **${result.person.block}**.`
                          : `Make your way to the **${result.person.block}**.`,
                        result.person.hint,
                      ].map((s, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-700">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span className="pt-0.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: s.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>') }} />
                        </li>
                      ))}
                    </ol>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-full">
                      <FileText className="w-3.5 h-3.5" /> {result.source.label}
                    </div>
                    <div className="flex gap-2 mt-5">
                      <button
                        onClick={() => setStep("to")}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-700"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back
                      </button>
                      <button
                        onClick={() => {
                          setStep("from");
                          setFrom(null);
                          setTo(null);
                        }}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-college px-3.5 py-2 rounded-full ml-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> New route
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
