import React from "react";
import { motion } from "framer-motion";
import { suggestionCards } from "@/data/suggestionCards";
import { useChat } from "@/context/ChatContext";

const colorMap = {
  blue: "from-blue-500 to-blue-600",
  amber: "from-amber-400 to-amber-500",
  rose: "from-rose-400 to-rose-500",
  violet: "from-violet-500 to-violet-600",
  emerald: "from-emerald-400 to-emerald-500",
  cyan: "from-cyan-400 to-cyan-500",
};

export default function SuggestionCards() {
  const { sendMessage } = useChat();

  const handleCardClick = (card) => {
    if (card.isMap) {
      const navEl = document.getElementById("campus-map-navigator");
      if (navEl) {
        navEl.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          const input = navEl.querySelector("input");
          input?.focus();
        }, 400);
        return;
      }
    }
    sendMessage(card.query);
  };

  return (
    <section className="mt-10">
      <div className="text-center mb-6">
        <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900">
          Explore Your <span className="text-gradient-college">College</span>
        </h2>
        <p className="text-slate-500 mt-1.5">Tap a card to ask the AI or find directions instantly</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {suggestionCards.map((card, i) => (
          <motion.button
            key={card.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            whileHover={{ y: -4 }}
            onClick={() => handleCardClick(card)}
            className="group text-left bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all"
          >
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorMap[card.color]} flex items-center justify-center text-xl mb-3 shadow-sm`}
            >
              {card.emoji}
            </div>
            <h3 className="font-heading font-bold text-slate-900">{card.title}</h3>
            <p className="text-sm text-slate-500 mt-0.5 leading-snug">{card.desc}</p>
          </motion.button>
        ))}
      </div>
    </section>
  );
}