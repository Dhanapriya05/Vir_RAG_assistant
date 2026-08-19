import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, FileText, Sparkles, Mic } from "lucide-react";
import ReactMarkdown from "react-markdown";

const iconMap = { FileText, Sparkles, Mic };

export default function FAQAccordion({ categories }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const Icon = iconMap[cat.icon] || FileText;
        return (
          <div key={cat.category}>
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/15 to-amber-500/10">
                <Icon className="h-4 w-4 text-red-400" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">{cat.category}</h3>
            </div>

            <div className="space-y-2">
              {cat.questions.map((item, i) => {
                const key = `${cat.category}-${i}`;
                const isOpen = open === key;
                return (
                  <div key={key} className="overflow-hidden rounded-xl glass-light">
                    <button
                      onClick={() => setOpen(isOpen ? null : key)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-sm font-medium text-slate-200">{item.q}</span>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="px-4 pb-4 md-content max-w-none text-sm">
                            <ReactMarkdown>{item.a}</ReactMarkdown>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
