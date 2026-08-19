import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { faqCategories } from "@/data/faqData";
import { useChat } from "@/context/ChatContext";

const colorMap = {
  blue: { dot: "bg-blue-500", text: "text-blue-700", chip: "hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700" },
  violet: { dot: "bg-violet-500", text: "text-violet-700", chip: "hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700" },
  amber: { dot: "bg-amber-500", text: "text-amber-700", chip: "hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700" },
  emerald: { dot: "bg-emerald-500", text: "text-emerald-700", chip: "hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700" },
};

export default function FAQPanel() {
  const { sendMessage } = useChat();
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div id="faqs" className="card-soft p-5 sm:p-6 scroll-mt-20 h-full">
      <h2 className="font-heading font-extrabold text-xl text-slate-900">Frequently Asked</h2>
      <p className="text-sm text-slate-500 mt-1">Popular questions students ask</p>

      <div className="mt-4 space-y-2">
        {faqCategories.map((cat, idx) => {
          const c = colorMap[cat.color] || colorMap.blue;
          const open = openIdx === idx;
          return (
            <div key={cat.title} className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
              <button
                onClick={() => setOpenIdx(open ? -1 : idx)}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left"
              >
                <span className="text-lg">{cat.emoji}</span>
                <span className="font-semibold text-slate-900 text-sm">{cat.title}</span>
                <ChevronDown
                  className={`w-4 h-4 ml-auto text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3.5 pb-3 space-y-1.5">
                      {cat.questions.map((q) => (
                        <button
                          key={q}
                          onClick={() => sendMessage(q)}
                          className={`block w-full text-left text-sm text-slate-600 bg-slate-50 border border-transparent ${c.chip} px-3 py-2 rounded-xl transition-colors`}
                        >
                          {q}
                        </button>
                      ))}
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
}
